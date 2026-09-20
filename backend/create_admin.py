import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SECRET_KEY")
supabase = create_client(url, key)

email = "k.nithwik750@gmail.com"
username = "k.nithwik"
password = "AdminPassword123!"

try:
    print(f"Creating user {email}...")
    user_response = supabase.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True
    })
    
    user_id = user_response.user.id
    print(f"Auth user created successfully with ID: {user_id}")
    
    profile = {
        "auth_user_id": user_id,
        "full_name": "Admin Nithwik",
        "username": username,
        "email": email,
        "role": "ADMIN",
        "status": "ACTIVE"
    }
    
    supabase.table("profiles").insert(profile).execute()
    print("Admin profile created successfully.")
    print(f"\nLogin Email: {email}")
    print(f"Login Password: {password}")

except Exception as e:
    print(f"Failed: {e}")
