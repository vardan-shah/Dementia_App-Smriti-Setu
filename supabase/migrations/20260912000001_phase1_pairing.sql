-- 20260912000001_phase1_pairing.sql

-- 1. Decouple elder_profiles from public.users so caregivers can create them before the elder logs in.
ALTER TABLE public.elder_profiles DROP CONSTRAINT elder_profiles_id_fkey;
-- (id remains a UUID, we just remove the foreign key constraint)

-- 2. Create pairing_codes table
CREATE TABLE public.pairing_codes (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    elder_id UUID REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create elder_devices table mapping anonymous auth.users to elder_profiles
CREATE TABLE public.elder_devices (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    elder_id UUID REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
    paired_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.pairing_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elder_devices ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Pairing Codes
-- Caregivers can manage codes they created
CREATE POLICY "Caregivers manage their pairing codes" ON public.pairing_codes FOR ALL USING (created_by = auth.uid());

-- 6. RLS Policies for Elder Devices
-- Elders can read their own device link
CREATE POLICY "Elders can read own device link" ON public.elder_devices FOR SELECT USING (id = auth.uid());
-- Caregivers can read devices linked to their elders
CREATE POLICY "Caregivers can read linked elder devices" ON public.elder_devices FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.caregiver_elder_links WHERE caregiver_id = auth.uid() AND elder_id = public.elder_devices.elder_id)
);

-- 7. Update elder_profiles policies to support elder devices
-- Drop the old policy first
DROP POLICY IF EXISTS "Elders can read own profile" ON public.elder_profiles;

-- Recreate: An elder can read their profile if their device is linked to it.
CREATE POLICY "Elders can read own profile via device" ON public.elder_profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.elder_devices WHERE elder_devices.id = auth.uid() AND elder_devices.elder_id = public.elder_profiles.id)
);

-- Note: Caregiver policies on elder_profiles (Caregivers can read linked elder profiles) remain intact from previous migration.
-- But caregivers also need to be able to INSERT elder profiles.
CREATE POLICY "Caregivers can create elder profiles" ON public.elder_profiles FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' -- Any authenticated user can create an elder profile (they will link it next)
);
CREATE POLICY "Caregivers can update linked elder profiles" ON public.elder_profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.caregiver_elder_links WHERE caregiver_id = auth.uid() AND elder_id = id)
);

-- Update caregiver_elder_links so caregivers can create links to elders they manage
CREATE POLICY "Caregivers can link elders" ON public.caregiver_elder_links FOR INSERT WITH CHECK (
    caregiver_id = auth.uid()
);

-- Update users table to allow inserting on signup (Supabase usually handles auth.users, but we might need public.users to sync via a trigger).
-- For prototype, we allow users to insert their own public.users record.
CREATE POLICY "Users can insert own record" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

