-- 20260912000005_phase5_6_migration_hardening.sql
-- Final robust database schema reconciliation and security hardening

-- 1. Cultural Profiles Robustness
DO $$
BEGIN
    -- Ensure table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cultural_profiles') THEN
        CREATE TABLE public.cultural_profiles (
            id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
            elder_id UUID NOT NULL,
            region TEXT NOT NULL,
            preferred_language TEXT NOT NULL,
            secondary_language TEXT,
            preferred_themes TEXT[] DEFAULT '{}',
            custom_notes TEXT,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            UNIQUE(elder_id)
        );
    END IF;

    -- Ensure FK points to elder_profiles, not legacy 'elders'
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'cultural_profiles'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name != 'elder_profiles'
    ) THEN
        ALTER TABLE public.cultural_profiles DROP CONSTRAINT IF EXISTS cultural_profiles_elder_id_fkey;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'cultural_profiles'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'elder_profiles'
    ) THEN
        ALTER TABLE public.cultural_profiles
            ADD CONSTRAINT cultural_profiles_elder_id_fkey 
            FOREIGN KEY (elder_id) REFERENCES public.elder_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS and enforce robust Caregiver mapping
ALTER TABLE public.cultural_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Caregivers can manage linked elder cultural profiles" ON public.cultural_profiles;
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

DROP POLICY IF EXISTS "Elders can view own cultural profiles" ON public.cultural_profiles;
CREATE POLICY "Elders can view own cultural profiles"
    ON public.cultural_profiles
    FOR SELECT
    USING (elder_id = auth.uid());


-- 2. Reminders Safe Dynamic Column Mapping
DO $$
BEGIN
    -- Handle missing "time" column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'time') THEN
        ALTER TABLE public.reminders ADD COLUMN "time" TEXT;
    END IF;

    -- Safely migrate scheduled_time -> time if scheduled_time exists
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'scheduled_time') THEN
        EXECUTE 'UPDATE public.reminders SET "time" = to_char(scheduled_time, ''HH24:MI'') WHERE "time" IS NULL AND scheduled_time IS NOT NULL';
    END IF;

    -- Fallback safety so we can enforce NOT NULL
    EXECUTE 'UPDATE public.reminders SET "time" = ''09:00'' WHERE "time" IS NULL';
    ALTER TABLE public.reminders ALTER COLUMN "time" SET NOT NULL;

    -- Rename legacy is_completed if present
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'is_completed') THEN
        ALTER TABLE public.reminders RENAME COLUMN is_completed TO completed_today;
    END IF;
    
    -- Ensure completed_today exists in case table was created fresh somehow
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'completed_today') THEN
        ALTER TABLE public.reminders ADD COLUMN completed_today BOOLEAN DEFAULT false NOT NULL;
    END IF;

    -- Add recurrence
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'recurrence') THEN
        ALTER TABLE public.reminders ADD COLUMN recurrence TEXT DEFAULT 'DAILY' NOT NULL;
    END IF;

    -- Add enabled
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'enabled') THEN
        ALTER TABLE public.reminders ADD COLUMN enabled BOOLEAN DEFAULT true NOT NULL;
    END IF;

    -- Add last_completed_date
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'last_completed_date') THEN
        ALTER TABLE public.reminders ADD COLUMN last_completed_date TEXT;
    END IF;
END $$;


-- 3. Reminders Policy Hardening
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Deny Elder UPDATE entirely across the domain table
DROP POLICY IF EXISTS "Elders can update own reminders" ON public.reminders;

-- Caregiver management
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

-- Elder read-only
DROP POLICY IF EXISTS "Elders can view own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Elders can read own reminders" ON public.reminders;
CREATE POLICY "Elders can view own reminders"
    ON public.reminders
    FOR SELECT
    USING (elder_id = auth.uid());


-- 4. Secure RPC for Reminder Completion
-- Requires explicit search_path and revoking PUBLIC EXECUTE privileges

CREATE OR REPLACE FUNCTION public.update_reminder_completion(
    p_reminder_id UUID,
    p_completed_today BOOLEAN,
    p_last_completed_date TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Strict ownership enforcement checking fully qualified public tables
    IF NOT EXISTS (
        SELECT 1 FROM public.reminders r
        WHERE r.id = p_reminder_id
        AND r.elder_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not the elder assigned to this reminder';
    END IF;

    -- Narrow bounded mutation targeting completion status exclusively
    UPDATE public.reminders
    SET completed_today = p_completed_today,
        last_completed_date = p_last_completed_date
    WHERE id = p_reminder_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_reminder_completion(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_reminder_completion(UUID, BOOLEAN, TEXT) TO authenticated;
