-- Migration: 20260915000007_elder_deletion
-- Purpose: Provide a secure RPC for caregivers to delete their elder profiles.

CREATE OR REPLACE FUNCTION public.delete_elder_profile(p_elder_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caregiver_id uuid;
  v_link_exists boolean;
BEGIN
  v_caregiver_id := auth.uid();
  IF v_caregiver_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify ownership: Does this caregiver have a link to this elder?
  SELECT EXISTS (
    SELECT 1 FROM caregiver_elder_links
    WHERE caregiver_id = v_caregiver_id AND elder_id = p_elder_id
  ) INTO v_link_exists;

  IF NOT v_link_exists THEN
    RAISE EXCEPTION 'Not authorized to delete this elder profile';
  END IF;

  -- Because all foreign keys pointing to elder_profiles have ON DELETE CASCADE,
  -- deleting the elder_profiles row will automatically delete:
  -- caregiver_elder_links, cultural_profiles, relatives, memories, reminders,
  -- games, game_sessions, game_attempts, performance_metrics, cognitive_profiles,
  -- baseline_snapshots, change_alerts, pairing_codes, elder_devices.
  
  DELETE FROM elder_profiles
  WHERE id = p_elder_id;

END;
$$;
