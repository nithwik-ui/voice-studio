import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SECRET_KEY")
supabase = create_client(url, key)

# The auth user was already created. Now just insert the profile.
user_id = "3e365175-42ad-47e9-85fe-fcac1b277005"
email = "k.nithwik750@gmail.com"
username = "k.nithwik"

try:
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
    print(f"Login Password: AdminPassword123!")
except Exception as e:
    print(f"Failed: {e}")
