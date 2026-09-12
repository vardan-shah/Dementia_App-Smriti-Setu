-- 20260912000004_phase5_5_reconciliation.sql
-- Forward-only reconciliation migration

-- 1. Ensure cultural_profiles FK correctly points to elder_profiles (idempotent repair)
DO $$
BEGIN
    -- Drop the FK if it accidentally points to 'elders' (historical mistake)
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'cultural_profiles'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'elders'
    ) THEN
        ALTER TABLE public.cultural_profiles DROP CONSTRAINT cultural_profiles_elder_id_fkey;
        
        ALTER TABLE public.cultural_profiles
            ADD CONSTRAINT cultural_profiles_elder_id_fkey 
            FOREIGN KEY (elder_id) REFERENCES public.elder_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Drop the overly broad Elder UPDATE policy on reminders
DROP POLICY IF EXISTS "Elders can update own reminders" ON public.reminders;

-- 3. Create a strict Security Definer function for elders to update ONLY completion state
CREATE OR REPLACE FUNCTION public.update_reminder_completion(
    p_reminder_id UUID,
    p_completed_today BOOLEAN,
    p_last_completed_date TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify the caller is the elder who owns the reminder
    IF NOT EXISTS (
        SELECT 1 FROM public.reminders
        WHERE id = p_reminder_id
        AND elder_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Not the owner of this reminder';
    END IF;

    -- Update ONLY the completion fields securely
    UPDATE public.reminders
    SET completed_today = p_completed_today,
        last_completed_date = p_last_completed_date
    WHERE id = p_reminder_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.update_reminder_completion(UUID, BOOLEAN, TEXT) TO authenticated;
