import psycopg2

conn = psycopg2.connect(
    host='db.wuutxaljcfhpjzjtzrsc.supabase.co',
    port=5432,
    dbname='postgres',
    user='postgres',
    password='LbN6kdcW@YM)Vw8',
    sslmode='require'
)
conn.autocommit = True
cur = conn.cursor()

print("Applying schema updates for full workflow...")

# 1. Alter projects status to TEXT so it accepts all state machine transitions
cur.execute("ALTER TABLE public.projects ALTER COLUMN status TYPE TEXT USING status::text;")
cur.execute("ALTER TABLE public.projects ALTER COLUMN status SET DEFAULT 'DRAFT';")

# 2. Alter submissions status to TEXT
cur.execute("ALTER TABLE public.submissions ALTER COLUMN status TYPE TEXT USING status::text;")
cur.execute("ALTER TABLE public.submissions ALTER COLUMN status SET DEFAULT 'PENDING';")

# 3. Add columns to submissions if not exist
cur.execute("ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;")
cur.execute("ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS drive_file_id TEXT;")
cur.execute("ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS notes TEXT;")

# 4. Alter revision_requests status to TEXT
cur.execute("ALTER TABLE public.revision_requests ALTER COLUMN status TYPE TEXT USING status::text;")
cur.execute("ALTER TABLE public.revision_requests ALTER COLUMN status SET DEFAULT 'REVISION_REQUIRED';")

# 5. Alter final_videos
cur.execute("ALTER TABLE public.final_videos ALTER COLUMN recording_id DROP NOT NULL;")
cur.execute("ALTER TABLE public.final_videos ALTER COLUMN status TYPE TEXT USING status::text;")
cur.execute("ALTER TABLE public.final_videos ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;")

# 6. Create project_files table
cur.execute("""
CREATE TABLE IF NOT EXISTS public.project_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    drive_file_id TEXT NOT NULL,
    drive_folder_id TEXT,
    filename TEXT NOT NULL,
    mime_type TEXT DEFAULT 'video/mp4',
    size BIGINT,
    version INT NOT NULL DEFAULT 1,
    type TEXT NOT NULL DEFAULT 'EDITED_VIDEO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
""")

cur.execute("ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;")
try:
    cur.execute("""
        CREATE POLICY "Allow authenticated full access to project_files" 
        ON public.project_files FOR ALL TO authenticated USING (true) WITH CHECK (true);
    """)
except Exception as e:
    print(f"Policy note: {e}")

try:
    cur.execute("""
        CREATE POLICY "Allow service role full access to project_files" 
        ON public.project_files FOR ALL TO service_role USING (true) WITH CHECK (true);
    """)
except Exception as e:
    print(f"Policy note: {e}")

print("Schema migration completed successfully!")
cur.close()
conn.close()
