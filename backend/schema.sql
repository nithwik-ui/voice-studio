-- VoiceFlow Studio Database Schema (PostgreSQL / Supabase)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE processing_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE entity_type_enum AS ENUM ('VIDEO', 'PROJECT', 'RECORDING', 'SUBMISSION', 'REVISION');
CREATE TYPE project_status AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'APPROVED');
CREATE TYPE clip_status AS ENUM ('PENDING', 'RECORDED', 'APPROVED', 'REVISION_NEEDED');
CREATE TYPE submission_status AS ENUM ('PENDING', 'APPROVED', 'REVISION_REQUESTED');

-- 1. profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'USER',
    status user_status DEFAULT 'ACTIVE',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. videos
CREATE TABLE public.videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    drive_file_id TEXT NOT NULL,
    drive_folder_id TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    duration NUMERIC,
    resolution TEXT,
    fps NUMERIC,
    status processing_status DEFAULT 'PENDING',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. video_clips
CREATE TABLE public.video_clips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    clip_number INT NOT NULL,
    start_time NUMERIC NOT NULL,
    end_time NUMERIC NOT NULL,
    duration NUMERIC NOT NULL,
    drive_file_id TEXT NOT NULL,
    thumbnail_drive_file_id TEXT,
    status processing_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. projects
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    video_id UUID REFERENCES public.videos(id),
    is_folder_project BOOLEAN DEFAULT false,
    source_drive_folder_id TEXT,
    assigned_user_id UUID REFERENCES public.profiles(id),
    deadline TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    status project_status DEFAULT 'DRAFT',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DEPRECATED: 5. project_clips
-- CREATE TABLE public.project_clips (...);

-- 6. recordings
CREATE TABLE public.recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    drive_file_id TEXT NOT NULL,
    source_drive_file_id TEXT,
    source_filename TEXT,
    take_number INT NOT NULL DEFAULT 1,
    mime_type TEXT,
    file_size BIGINT,
    duration NUMERIC,
    status processing_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Foreign Key constraint update (Deprecated)
-- ALTER TABLE public.project_clips ADD CONSTRAINT fk_current_recording FOREIGN KEY (current_recording_id) REFERENCES public.recordings(id) ON DELETE SET NULL;

-- 7. final_videos
CREATE TABLE public.final_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    recording_id UUID NOT NULL REFERENCES public.recordings(id),
    drive_file_id TEXT NOT NULL,
    status processing_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. submissions
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES public.profiles(id),
    status submission_status DEFAULT 'PENDING',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES public.profiles(id)
);

-- 9. revision_requests
CREATE TABLE public.revision_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    message TEXT NOT NULL,
    status project_status DEFAULT 'REVISION_REQUESTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. revision_request_clips (Deprecated)
-- CREATE TABLE public.revision_request_clips (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     revision_request_id UUID NOT NULL REFERENCES public.revision_requests(id) ON DELETE CASCADE,
--     project_clip_id UUID NOT NULL REFERENCES public.project_clips(id) ON DELETE CASCADE,
--     comment TEXT,
--     status clip_status DEFAULT 'REVISION_NEEDED'
-- );

-- 11. notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type entity_type_enum NOT NULL,
    entity_id UUID NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. processing_jobs
CREATE TABLE public.processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type TEXT NOT NULL,
    entity_type entity_type_enum NOT NULL,
    entity_id UUID NOT NULL,
    status processing_status DEFAULT 'PENDING',
    progress NUMERIC DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. activity_events
CREATE TABLE public.activity_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL, 
    entity_type entity_type_enum NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. storage_objects (To track Google Drive usage & sync)
CREATE TABLE public.storage_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_file_id TEXT UNIQUE NOT NULL,
    entity_type entity_type_enum NOT NULL,
    entity_id UUID NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. settings
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on active tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can read their own profile, Admins can read all.
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth_user_id = auth.uid() OR is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth_user_id = auth.uid() OR is_admin());

-- Videos: Admins can do everything, Users can read all (needed for project assignment viewing)
CREATE POLICY "Videos readable by all" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Videos manageable by admin" ON public.videos FOR ALL USING (is_admin());

-- Projects: Users can view assigned projects, Admins can view all
CREATE POLICY "Users view assigned projects" ON public.projects FOR SELECT USING (
  assigned_user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) OR is_admin()
);
CREATE POLICY "Users can update assigned projects (for status changes)" ON public.projects FOR UPDATE USING (
  assigned_user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) OR is_admin()
);
CREATE POLICY "Admins manage projects" ON public.projects FOR ALL USING (is_admin());

-- Recordings: Users manage own recordings, Admins can read all
CREATE POLICY "Users manage own recordings" ON public.recordings FOR ALL USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) OR is_admin()
);

-- Final Videos: Users can read final videos of their projects, Admins manage
CREATE POLICY "Final videos readable by assigned users" ON public.final_videos FOR SELECT USING (
  project_id IN (
    SELECT id FROM public.projects WHERE assigned_user_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  ) OR is_admin()
);
CREATE POLICY "Admins manage final videos" ON public.final_videos FOR ALL USING (is_admin());

-- Submissions & Revisions
CREATE POLICY "Submissions readable by assigned" ON public.submissions FOR SELECT USING (
  submitted_by IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) OR is_admin()
);
CREATE POLICY "Users create submissions" ON public.submissions FOR INSERT WITH CHECK (
  submitted_by IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) OR is_admin()
);

CREATE POLICY "Revisions readable by assigned" ON public.revision_requests FOR SELECT USING (
  submission_id IN (
    SELECT id FROM public.submissions WHERE submitted_by IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  ) OR is_admin()
);

-- Notifications: Users read own notifications
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) OR is_admin()
);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) OR is_admin()
);

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_assigned_user ON public.projects(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- Recordings
CREATE INDEX IF NOT EXISTS idx_recordings_project ON public.recordings(project_id);
CREATE INDEX IF NOT EXISTS idx_recordings_user ON public.recordings(user_id);

-- Final Videos
CREATE INDEX IF NOT EXISTS idx_final_videos_project ON public.final_videos(project_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);

-- Activity Events
CREATE INDEX IF NOT EXISTS idx_activity_events_created ON public.activity_events(created_at DESC);

