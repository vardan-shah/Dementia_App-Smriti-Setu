-- Phase 5.4 Schema Reconciliation

-- 1. Cultural Profiles (New Domain Table)
CREATE TABLE IF NOT EXISTS public.cultural_profiles (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    elder_id UUID NOT NULL REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
    region TEXT NOT NULL,
    preferred_language TEXT NOT NULL,
    secondary_language TEXT,
    preferred_themes TEXT[] DEFAULT '{}',
    custom_notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(elder_id)
);

ALTER TABLE public.cultural_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Caregivers can manage linked elder cultural profiles"
    ON public.cultural_profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.caregiver_elder_links cel
            WHERE cel.caregiver_id = auth.uid()
            AND cel.elder_id = public.cultural_profiles.elder_id
        )
    );

CREATE POLICY "Elders can view own cultural profiles"
    ON public.cultural_profiles
    FOR SELECT
    USING (
        elder_id = auth.uid()
    );

CREATE INDEX IF NOT EXISTS idx_cultural_profiles_elder_id ON public.cultural_profiles(elder_id);


-- 2. Reminders Table (Schema Evolution)

ALTER TABLE public.reminders 
    RENAME COLUMN is_completed TO completed_today;

ALTER TABLE public.reminders 
    ADD COLUMN "time" TEXT,
    ADD COLUMN recurrence TEXT DEFAULT 'DAILY' NOT NULL,
    ADD COLUMN enabled BOOLEAN DEFAULT true NOT NULL,
    ADD COLUMN last_completed_date TEXT;

-- Safely migrate existing values: extract HH24:MI from scheduled_time at UTC as a best-effort fallback
UPDATE public.reminders 
SET "time" = to_char(scheduled_time, 'HH24:MI')
WHERE "time" IS NULL;

-- Now make time NOT NULL since migration is done
ALTER TABLE public.reminders ALTER COLUMN "time" SET NOT NULL;

-- Drop scheduled_time if it's no longer used, but to be safe and preserve data we can leave it nullable
ALTER TABLE public.reminders ALTER COLUMN scheduled_time DROP NOT NULL;

-- Ensure RLS is active
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies from initial_schema to avoid duplicates
DROP POLICY IF EXISTS "Elders can read own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Caregivers can manage linked elder reminders" ON public.reminders;

CREATE POLICY "Caregivers can manage linked elder reminders"
    ON public.reminders
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.caregiver_elder_links cel
            WHERE cel.caregiver_id = auth.uid()
            AND cel.elder_id = public.reminders.elder_id
        )
    );

CREATE POLICY "Elders can view own reminders"
    ON public.reminders
    FOR SELECT
    USING (
        elder_id = auth.uid()
    );

CREATE POLICY "Elders can update own reminders"
    ON public.reminders
    FOR UPDATE
    USING (
        elder_id = auth.uid()
    );
