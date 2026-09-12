-- Cultural Profiles Table
CREATE TABLE IF NOT EXISTS public.cultural_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
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
            SELECT 1 FROM public.caregiver_elders
            WHERE caregiver_elders.elder_id = cultural_profiles.elder_id
            AND caregiver_elders.caregiver_id = auth.uid()
        )
    );

CREATE POLICY "Elders can view own cultural profiles"
    ON public.cultural_profiles
    FOR SELECT
    USING (
        elder_id = auth.uid()
    );

-- Reminders Table
CREATE TABLE IF NOT EXISTS public.reminders (
    id TEXT PRIMARY KEY, -- Using client-generated ID
    elder_id UUID NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "time" TEXT NOT NULL,
    recurrence TEXT NOT NULL DEFAULT 'DAILY',
    enabled BOOLEAN NOT NULL DEFAULT true,
    completed_today BOOLEAN NOT NULL DEFAULT false,
    last_completed_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Caregivers can manage linked elder reminders"
    ON public.reminders
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.caregiver_elders
            WHERE caregiver_elders.elder_id = reminders.elder_id
            AND caregiver_elders.caregiver_id = auth.uid()
        )
    );

CREATE POLICY "Elders can view and update own reminders"
    ON public.reminders
    FOR SELECT
    USING (
        elder_id = auth.uid()
    );

-- Allow Elders to update completed status of their own reminders (but not create/delete/change title)
CREATE POLICY "Elders can update own reminders"
    ON public.reminders
    FOR UPDATE
    USING (
        elder_id = auth.uid()
    );

-- Notification/Sync table indexes for performance (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_cultural_profiles_elder_id ON public.cultural_profiles(elder_id);
CREATE INDEX IF NOT EXISTS idx_reminders_elder_id ON public.reminders(elder_id);

