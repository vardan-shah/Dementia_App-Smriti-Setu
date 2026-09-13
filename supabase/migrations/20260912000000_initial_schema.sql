-- 20260912000000_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Core Users mapping (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ELDER', 'CAREGIVER', 'HEALTH_WORKER')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Elder Profiles
CREATE TABLE public.elder_profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    primary_language TEXT DEFAULT 'en',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_elder_profiles_modtime BEFORE UPDATE ON public.elder_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Caregiver Profiles
CREATE TABLE public.caregiver_profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_caregiver_profiles_modtime BEFORE UPDATE ON public.caregiver_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Link Elders and Caregivers
CREATE TABLE public.caregiver_elder_links (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    caregiver_id UUID REFERENCES public.caregiver_profiles(id) ON DELETE CASCADE,
    elder_id UUID REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
    relationship TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(caregiver_id, elder_id)
);

-- Memories (For Memory-to-Game)
CREATE TABLE public.memories (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    elder_id UUID REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    date_of_memory DATE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_memories_modtime BEFORE UPDATE ON public.memories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.memory_media (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    memory_id UUID REFERENCES public.memories(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('IMAGE', 'AUDIO', 'VIDEO')),
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.memory_people (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    memory_id UUID REFERENCES public.memories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relation_to_elder TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game Architecture
CREATE TABLE public.game_templates (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    cognitive_domain TEXT, -- e.g., 'MEMORY', 'ATTENTION'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.games (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    template_id UUID REFERENCES public.game_templates(id),
    elder_id UUID REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
    is_personalized BOOLEAN DEFAULT false,
    configuration JSONB, -- specific settings like difficulty
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.game_questions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    memory_id UUID REFERENCES public.memories(id) ON DELETE SET NULL, -- optional link
    question_text TEXT NOT NULL,
    options JSONB,
    correct_answer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions & Performance
CREATE TABLE public.game_sessions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    elder_id UUID REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT CHECK (status IN ('STARTED', 'COMPLETED', 'ABANDONED'))
);

CREATE TABLE public.game_attempts (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.game_questions(id) ON DELETE CASCADE,
    selected_answer TEXT,
    is_correct BOOLEAN,
    time_taken_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.performance_metrics (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    elder_id UUID REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
    accuracy_percentage NUMERIC,
    average_response_time_ms INTEGER,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cognitive Profiles (For Radar)
CREATE TABLE public.cognitive_profiles (
    id UUID PRIMARY KEY REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
    current_status TEXT,
    last_assessed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_cognitive_profiles_modtime BEFORE UPDATE ON public.cognitive_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.baseline_snapshots (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    elder_id UUID REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.change_alerts (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    elder_id UUID REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
    alert_type TEXT,
    description TEXT,
    severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Utilities
CREATE TABLE public.reminders (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    elder_id UUID REFERENCES public.elder_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    audio_url TEXT,
    scheduled_time TIMESTAMPTZ NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.sync_events (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX idx_game_sessions_elder ON public.game_sessions(elder_id);
CREATE INDEX idx_memories_elder ON public.memories(elder_id);
CREATE INDEX idx_sync_events_user_status ON public.sync_events(user_id, status);

-- ROW LEVEL SECURITY (RLS)

-- 1. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_elder_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cognitive_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baseline_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- 2. Policies

-- users: Users can read their own record.
CREATE POLICY "Users can read own record" ON public.users FOR SELECT USING (auth.uid() = id);

-- elder_profiles: Elders can read their own profile. Caregivers can read linked elders.
CREATE POLICY "Elders can read own profile" ON public.elder_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Caregivers can read linked elder profiles" ON public.elder_profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.caregiver_elder_links WHERE caregiver_id = auth.uid() AND elder_id = id)
);

-- caregiver_profiles: Caregivers can read/write their own profile. Elders can read their linked caregivers.
CREATE POLICY "Caregivers can manage own profile" ON public.caregiver_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Elders can read linked caregiver profiles" ON public.caregiver_profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.caregiver_elder_links WHERE elder_id = auth.uid() AND caregiver_id = id)
);

-- caregiver_elder_links: Users can read links where they are either the elder or caregiver.
CREATE POLICY "Users can read their own links" ON public.caregiver_elder_links FOR SELECT USING (
    caregiver_id = auth.uid() OR elder_id = auth.uid()
);

-- memories: Elders can read their own memories. Linked caregivers can read/write memories.
CREATE POLICY "Elders can read own memories" ON public.memories FOR SELECT USING (elder_id = auth.uid());
CREATE POLICY "Caregivers can manage linked elder memories" ON public.memories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.caregiver_elder_links WHERE caregiver_id = auth.uid() AND elder_id = public.memories.elder_id)
);

-- memory_media & memory_people: Same as memories.
CREATE POLICY "Elders can read own memory media" ON public.memory_media FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.memories WHERE memories.id = memory_id AND memories.elder_id = auth.uid())
);
CREATE POLICY "Caregivers can manage linked memory media" ON public.memory_media FOR ALL USING (
    EXISTS (SELECT 1 FROM public.memories m JOIN public.caregiver_elder_links l ON m.elder_id = l.elder_id WHERE m.id = memory_media.memory_id AND l.caregiver_id = auth.uid())
);

-- game_sessions: Elders can manage their sessions. Caregivers can view.
CREATE POLICY "Elders can manage own sessions" ON public.game_sessions FOR ALL USING (elder_id = auth.uid());
CREATE POLICY "Caregivers can read linked elder sessions" ON public.game_sessions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.caregiver_elder_links WHERE caregiver_id = auth.uid() AND elder_id = public.game_sessions.elder_id)
);

-- performance_metrics: Same logic.
CREATE POLICY "Elders can read own performance" ON public.performance_metrics FOR SELECT USING (elder_id = auth.uid());
CREATE POLICY "Caregivers can read linked elder performance" ON public.performance_metrics FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.caregiver_elder_links WHERE caregiver_id = auth.uid() AND elder_id = public.performance_metrics.elder_id)
);

-- reminders: Elders read, Caregivers manage.
CREATE POLICY "Elders can read own reminders" ON public.reminders FOR SELECT USING (elder_id = auth.uid());
CREATE POLICY "Caregivers can manage linked elder reminders" ON public.reminders FOR ALL USING (
    EXISTS (SELECT 1 FROM public.caregiver_elder_links WHERE caregiver_id = auth.uid() AND elder_id = public.reminders.elder_id)
);

-- sync_events: Users can manage their own sync events.
CREATE POLICY "Users can manage own sync events" ON public.sync_events FOR ALL USING (user_id = auth.uid());

-- audit_logs: Users can read their own logs. System creates them (bypasses RLS usually).
CREATE POLICY "Users can read own logs" ON public.audit_logs FOR SELECT USING (user_id = auth.uid());

-- game_templates: Universally readable by authenticated users
CREATE POLICY "Authenticated users can read templates" ON public.game_templates FOR SELECT USING (auth.role() = 'authenticated');
