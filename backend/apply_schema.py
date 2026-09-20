import psycopg2

# Direct PostgreSQL connection
# Password contains special chars so we use keyword args
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

with open("schema.sql", "r", encoding="utf-8") as f:
    schema = f.read()

print("Applying schema...")
try:
    cur.execute(schema)
    print("Schema applied successfully!")
except Exception as e:
    print(f"Schema error: {e}")

# Now insert the admin profile
user_id = "3e365175-42ad-47e9-85fe-fcac1b277005"
email = "k.nithwik750@gmail.com"
username = "k.nithwik"

print("\nCreating admin profile...")
try:
    cur.execute("""
        INSERT INTO public.profiles (auth_user_id, full_name, username, email, role, status)
        VALUES (%s, %s, %s, %s, 'ADMIN', 'ACTIVE')
        ON CONFLICT (auth_user_id) DO UPDATE SET role = 'ADMIN';
    """, (user_id, "Admin Nithwik", username, email))
    print("Admin profile created/updated successfully!")
    print(f"\nLogin Email:    {email}")
    print(f"Login Password: AdminPassword123!")
    print(f"Role:           ADMIN")
except Exception as e:
    print(f"Profile error: {e}")

cur.close()
conn.close()
