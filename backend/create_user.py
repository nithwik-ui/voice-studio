import psycopg2
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

# Create user account via Supabase Auth Admin API
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SECRET_KEY")
supabase = create_client(url, key)

email = "nithwik59@gmail.com"
password = "UserPassword123!"

try:
    print(f"Creating user {email}...")
    user_response = supabase.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True
    })
    user_id = user_response.user.id
    print(f"Auth user created with ID: {user_id}")

    # Now insert profile via direct psycopg2
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

    cur.execute("""
        INSERT INTO public.profiles (auth_user_id, full_name, username, email, role, status)
        VALUES (%s, %s, %s, %s, 'USER', 'ACTIVE')
        ON CONFLICT (auth_user_id) DO UPDATE SET role = 'USER';
    """, (user_id, "Nithwik User", "nithwik59", email))

    print("User profile created!")
    print(f"\nLogin Email:    {email}")
    print(f"Login Password: {password}")
    print(f"Role:           USER")

    cur.close()
    conn.close()

except Exception as e:
    print(f"Failed: {e}")
