-- Phase 2: Memory Vault Models (Relatives & Stories)

-- 1. Create Relatives table
CREATE TABLE public.relatives (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    elder_id UUID REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    photo_url TEXT,
    voice_url TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_relatives_modtime BEFORE UPDATE ON public.relatives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Modify existing 'memories' table to act as Memory Stories
-- Adding relationship link, direct photo and voice columns
ALTER TABLE public.memories
ADD COLUMN relative_id UUID REFERENCES public.relatives(id) ON DELETE SET NULL,
ADD COLUMN photo_url TEXT,
ADD COLUMN voice_url TEXT
;


-- Migrate existing memory_people to relatives, and link memories if applicable
-- For prototype phase, this safely moves the data concept without data loss
DO $$
DECLARE
    rec RECORD;
    new_relative_id UUID;
BEGIN
    FOR rec IN 
        SELECT mp.id as mp_id, mp.memory_id, mp.name, COALESCE(mp.relation_to_elder, 'Unknown') as relationship, m.elder_id 
        FROM public.memory_people mp 
        JOIN public.memories m ON m.id = mp.memory_id
    LOOP
        new_relative_id := extensions.uuid_generate_v4();
        
        INSERT INTO public.relatives (id, elder_id, name, relationship, created_at, updated_at)
        VALUES (new_relative_id, rec.elder_id, rec.name, rec.relationship, NOW(), NOW());
        
        UPDATE public.memories SET relative_id = new_relative_id WHERE id = rec.memory_id;
    END LOOP;
END $$;

-- 3. RLS for relatives
ALTER TABLE public.relatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Elders can read own relatives" ON public.relatives FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.elder_devices WHERE elder_devices.id = auth.uid() AND elder_devices.elder_id = public.relatives.elder_id)
);

CREATE POLICY "Caregivers can manage linked elder relatives" ON public.relatives FOR ALL USING (
    EXISTS (SELECT 1 FROM public.caregiver_elder_links WHERE caregiver_id = auth.uid() AND elder_id = public.relatives.elder_id)
);

-- Note: The existing 'memories' table already has RLS, but we ensure the elder device lookup matches our pairing logic
DROP POLICY IF EXISTS "Elders can read own memories" ON public.memories;
CREATE POLICY "Elders can read own memories" ON public.memories FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.elder_devices WHERE elder_devices.id = auth.uid() AND elder_devices.elder_id = public.memories.elder_id)
);
