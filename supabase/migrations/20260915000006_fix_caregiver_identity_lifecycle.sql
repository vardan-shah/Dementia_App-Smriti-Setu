-- Migration: 20260915000006_fix_caregiver_identity_lifecycle
-- Purpose: Fix the blocking production bug where newly registered caregivers
--          could not create elders due to missing public.users / caregiver_profiles rows.
--
-- Root Cause:
--   auth.users.id → public.users.id → caregiver_profiles.id → caregiver_elder_links.caregiver_id
--   The FK chain requires rows in BOTH public.users AND caregiver_profiles.
--   Registration used direct upserts blocked by RLS; new caregivers had auth.users rows
--   but no profile rows, causing FK violations on elder creation.
--
-- Applied to production: 2026-09-15 (via Supabase MCP execute_sql)

-- 1. Trigger function: auto-provisions public.users when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'CAREGIVER')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Trigger on auth.users (AFTER INSERT)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- 3. Idempotent RPC: ensures both public.users and caregiver_profiles exist
--    Called at registration and login to self-heal any missing profile rows.
CREATE OR REPLACE FUNCTION public.ensure_caregiver_profile(p_full_name text DEFAULT 'Caregiver')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.users (id, email, role)
  SELECT v_uid, email, 'CAREGIVER'
  FROM auth.users WHERE id = v_uid
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.caregiver_profiles (id, full_name)
  VALUES (v_uid, p_full_name)
  ON CONFLICT (id) DO NOTHING;

  RETURN jsonb_build_object('id', v_uid, 'status', 'ok');
END;
$$;

-- 4. One-time repair: sync existing auth.users without profile rows
INSERT INTO public.users (id, email, role)
SELECT au.id, au.email, 'CAREGIVER'
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL AND au.role = 'authenticated'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.caregiver_profiles (id, full_name)
SELECT au.id, COALESCE(SPLIT_PART(au.email, '@', 1), 'Caregiver')
FROM auth.users au
LEFT JOIN public.caregiver_profiles cp ON cp.id = au.id
LEFT JOIN public.users u ON u.id = au.id
WHERE cp.id IS NULL AND u.role = 'CAREGIVER'
ON CONFLICT (id) DO NOTHING;
