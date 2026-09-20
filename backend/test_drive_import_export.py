import os
import sys
import httpx
from supabase import create_client
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)
load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
API_BASE = "http://localhost:8000"

print(f"Connecting to Supabase at {SUPABASE_URL}...")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
client = httpx.Client(base_url=API_BASE, timeout=60.0)

print("\n--- 1. Authenticate as Admin ---")
admin_auth = supabase.auth.sign_in_with_password({
    "email": "k.nithwik750@gmail.com",
    "password": "AdminPassword123!"
})
admin_token = admin_auth.session.access_token
admin_headers = {"Authorization": f"Bearer {admin_token}"}
print(f"Logged in as admin: {admin_auth.user.email}")

print("\n--- 2. Test Live Storage Usage Endpoint (/api/storage/usage) ---")
res = client.get("/api/storage/usage", headers=admin_headers)
assert res.status_code == 200, f"HTTP {res.status_code}: {res.text}"
storage = res.json()
print("Live Storage Telemetry:")
print(f"  - Total Used: {storage.get('total_used')} GB")
print(f"  - Total Capacity: {storage.get('total_capacity')} GB")
print(f"  - Authorized Account: {storage.get('user_email')}")
print(f"  - Health: {storage.get('health')}")
print(f"  - Category Breakdown: {storage.get('breakdown')}")
assert storage.get("total_used") > 0, "total_used must be > 0"
assert storage.get("total_capacity") > 0, "total_capacity must be > 0"
assert "Original Videos" in storage.get("breakdown", {}), "breakdown missing Original Videos"

print("\n--- 3. Test List Drive Videos Endpoint (/api/drive/videos) ---")
res = client.get("/api/drive/videos", headers=admin_headers)
assert res.status_code == 200, f"HTTP {res.status_code}: {res.text}"
drive_videos = res.json()
print(f"Successfully retrieved {len(drive_videos)} video files from Google Drive:")
for v in drive_videos[:5]:
    print(f"  - {v['name']} ({v['size_formatted']}) [ID: {v['id']}]")
assert len(drive_videos) > 0, "Expected at least 1 video in Google Drive"

print("\n--- 4. Test Create Project Directly from Google Drive (/api/projects/create-from-drive) ---")
# Pick the first real drive video
test_video = drive_videos[0]
target_talent = supabase.table("profiles").select("id, full_name, email").eq("role", "USER").execute().data[0]
print(f"Assigning to talent: {target_talent['full_name']} ({target_talent['email']})")

project_payload = {
    "title": f"Production Review - {test_video['name']}",
    "drive_file_id": test_video["id"],
    "original_filename": test_video["name"],
    "assigned_user_id": target_talent["id"],
    "instructions": "Please record crisp voiceover narration following the standard timing cue.",
    "file_size_bytes": test_video["size_bytes"]
}

res = client.post("/api/projects/create-from-drive", json=project_payload, headers=admin_headers)
assert res.status_code == 200, f"HTTP {res.status_code}: {res.text}"
created_data = res.json()
print(f"Created project: ID={created_data['project']['id']}, Status={created_data['project']['status']}")
assert created_data.get("status") == "success"
assert created_data["project"]["name"] == project_payload["title"]
assert created_data["video"]["drive_file_id"] == test_video["id"]

created_project_id = created_data["project"]["id"]

print("\n--- 5. Verify Project Details & Streaming for Imported Drive Video ---")
res = client.get(f"/api/projects/{created_project_id}/files", headers=admin_headers)
assert res.status_code == 200, f"HTTP {res.status_code}: {res.text}"
files_data = res.json()
assert files_data["original_video"]["drive_file_id"] == test_video["id"]
print(f"Original video verified: {files_data['original_video']['name']} (Drive ID: {files_data['original_video']['drive_file_id']})")

print("\n--- 6. Test Export All Projects Manifest (/api/projects/export-all) ---")
res = client.get("/api/projects/export-all", headers=admin_headers)
assert res.status_code == 200, f"HTTP {res.status_code}: {res.text}"
export_manifest = res.json()
print("Export Manifest Summary:")
print(f"  - Status: {export_manifest.get('status')}")
print(f"  - Total Projects: {export_manifest.get('total_projects')}")
print(f"  - Account: {export_manifest.get('account')}")
print(f"  - Workspace Root: {export_manifest.get('workspace_root')}")
assert export_manifest.get("total_projects", 0) > 0, "Expected projects in export manifest"

# Verify that the created project is in the manifest with its Google Drive URL
found = False
for p in export_manifest.get("projects", []):
    if p["project_id"] == created_project_id:
        found = True
        print(f"Found created project in manifest: {p['project_name']}")
        print(f"  - Drive URL: {p['original_video']['drive_url']}")
        assert p["original_video"]["drive_url"] is not None
        assert p["original_video"]["drive_file_id"] == test_video["id"]
        break
assert found, "Created project not found in export manifest"

print("\n==================================================")
print("ALL GOOGLE DRIVE IMPORT, LIVE STORAGE & EXPORT TESTS PASSED!")
print("==================================================")
