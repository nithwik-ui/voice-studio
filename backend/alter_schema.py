import psycopg2
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

# Direct PostgreSQL connection
conn = psycopg2.connect(
    host="db.wuutxaljcfhpjzjtzrsc.supabase.co",
    port=5432,
    dbname="postgres",
    user="postgres",
    password="LbN6kdcW@YM)Vw8",
    sslmode="require"
)
conn.autocommit = True
cur = conn.cursor()

try:
    print("Altering projects table...")
    cur.execute("ALTER TABLE public.projects ALTER COLUMN video_id DROP NOT NULL;")
    cur.execute("ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_folder_project BOOLEAN DEFAULT false;")
    cur.execute("ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS source_drive_folder_id TEXT;")
    print("Projects table altered.")
    
    print("Altering recordings table...")
    cur.execute("ALTER TABLE public.recordings ADD COLUMN IF NOT EXISTS source_drive_file_id TEXT;")
    cur.execute("ALTER TABLE public.recordings ADD COLUMN IF NOT EXISTS source_filename TEXT;")
    print("Recordings table altered.")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    cur.close()
    conn.close()
