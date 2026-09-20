import os
import io
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

results = {}

def report(step_name, passed, detail=""):
    status = "PASS" if passed else "FAIL"
    results[step_name] = (status, detail)
    print(f"[{status}] {step_name}: {detail}")
    if not passed:
        print(f"ABORTING DUE TO FAILURE ON: {step_name}")
        sys.exit(1)

# Minimal MP4 file bytes for testing (valid ftyp box)
MINIMAL_MP4 = (
    b'\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2avc1mp41'
    b'\x00\x00\x00\x08free'
    b'\x00\x00\x00\x10mdatHelloVoiceFlow'
)

# Minimal WebM audio bytes
MINIMAL_WEBM = b'\x1a\x45\xdf\xa3\x9f\x42\x86\x81\x01\x42\xf7\x81\x01\x42\xf2\x81\x04\x42\xf3\x81\x08'

print("\n==================================================")
print("VOICEFLOW STUDIO END-TO-END VERIFICATION SUITE")
print("==================================================\n")

# STEP 1: Admin Authentication
print("--- STEP 1: Admin Authentication ---")
try:
    admin_auth = supabase.auth.sign_in_with_password({
        "email": "k.nithwik750@gmail.com",
        "password": "AdminPassword123!"
    })
    admin_token = admin_auth.session.access_token
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    report("Admin Login", True, f"Admin logged in successfully ({admin_auth.user.email})")
except Exception as e:
    report("Admin Login", False, str(e))

# STEP 2: Google Drive Connection Status & Quota
print("\n--- STEP 2: Google Drive Connection Verification ---")
try:
    res = client.get("/api/storage/usage", headers=admin_headers)
    assert res.status_code == 200, f"HTTP {res.status_code}: {res.text}"
    storage_data = res.json()
    assert storage_data.get("status") == "Connected", "Drive status not Connected"
    assert "gmail.com" in storage_data.get("user_email", ""), "User email not found"
    report("Google Drive Live Connection", True, f"Account: {storage_data.get('user_email')}, Quota: {storage_data.get('total_capacity')} GB, Used: {storage_data.get('total_used')} GB")
except Exception as e:
    report("Google Drive Live Connection", False, str(e))

# STEP 3: User Authentication
print("\n--- STEP 3: User Authentication ---")
try:
    user_auth = supabase.auth.sign_in_with_password({
        "email": "nithwik59@gmail.com",
        "password": "UserPassword123!"
    })
    user_token = user_auth.session.access_token
    user_headers = {"Authorization": f"Bearer {user_token}"}
    
    # Get user profile
    user_profile = supabase.table("profiles").select("*").eq("auth_user_id", user_auth.user.id).single().execute()
    user_profile_id = user_profile.data["id"]
    user_full_name = user_profile.data["full_name"]
    report("User Authentication", True, f"User: {user_full_name} ({user_profile.data['email']}), Profile ID: {user_profile_id}")
except Exception as e:
    report("User Authentication", False, str(e))

# STEP 4: Admin Creates Project & Uploads Source Video to Google Drive
print("\n--- STEP 4: Admin Uploads Video & Assigns Project ---")
project_title = "Training Video Batch 04"
project_id = None
try:
    files = {
        "video": ("training_video_batch_04_source.mp4", io.BytesIO(MINIMAL_MP4), "video/mp4")
    }
    data = {
        "title": project_title,
        "assigned_user_id": user_profile_id,
        "instructions": "Please record clean voice-over and ensure sync with the source video."
    }
    res = client.post("/api/videos/upload", headers=admin_headers, data=data, files=files)
    assert res.status_code == 200, f"HTTP {res.status_code}: {res.text}"
    upload_res = res.json()
    project_id = upload_res["project"]["id"]
    video_id = upload_res["project"]["video_id"]
    report("Admin Video Upload & Project Creation", True, f"Created project '{project_title}' (ID: {project_id})")
except Exception as e:
    report("Admin Video Upload & Project Creation", False, str(e))

# STEP 5: User Views Assigned Project
print("\n--- STEP 5: User Views Assigned Projects ---")
try:
    res = client.get("/api/projects", headers=user_headers)
    assert res.status_code == 200, f"HTTP {res.status_code}: {res.text}"
    projects = res.json()
    my_project = next((p for p in projects if p["id"] == project_id), None)
    assert my_project is not None, "Created project not found in user assigned list"
    assert my_project["status"] == "ASSIGNED", f"Expected ASSIGNED status, got {my_project['status']}"
    report("User Assigned Projects Query", True, f"Project '{my_project['name']}' retrieved with status {my_project['status']}")
except Exception as e:
    report("User Assigned Projects Query", False, str(e))

# STEP 6: Authorized Video Streaming Proxy
print("\n--- STEP 6: Video Streaming Proxy from Google Drive ---")
try:
    # Get drive_file_id of original video
    video_row = supabase.table("videos").select("*").eq("id", video_id).single().execute()
    drive_file_id = video_row.data["drive_file_id"]
    
    # Request video stream
    stream_res = client.get(f"/api/videos/{drive_file_id}/stream", headers=user_headers)
    assert stream_res.status_code in [200, 206], f"Stream returned HTTP {stream_res.status_code}"
    assert len(stream_res.content) > 0, "Empty stream response"
    report("Google Drive Video Streaming Proxy", True, f"Streamed {len(stream_res.content)} bytes from Google Drive file ID {drive_file_id}")
except Exception as e:
    report("Google Drive Video Streaming Proxy", False, str(e))

# STEP 7: User Records Voice-Over & Saves to Drive
print("\n--- STEP 7: Voice-Over Audio Save to Google Drive ---")
try:
    audio_files = {
        "audio": ("recording_take_01.webm", io.BytesIO(MINIMAL_WEBM), "audio/webm")
    }
    rec_res = client.post(f"/api/projects/{project_id}/record", headers=user_headers, files=audio_files)
    assert rec_res.status_code == 200, f"HTTP {rec_res.status_code}: {rec_res.text}"
    rec_data = rec_res.json()
    assert rec_data.get("status") == "success", "Recording save unsuccessful"
    report("Voice-Over Recording Save", True, f"Audio recorded and uploaded to Drive (Recording ID: {rec_data.get('recording_id')})")
except Exception as e:
    report("Voice-Over Recording Save", False, str(e))

# STEP 8: User Uploads Edited Video v1
print("\n--- STEP 8: User Uploads Edited Video v1 ---")
try:
    edited_files = {
        "video": ("Training_Video_Batch_04_v1.mp4", io.BytesIO(MINIMAL_MP4), "video/mp4")
    }
    upload_v1_res = client.post(f"/api/projects/{project_id}/edited-video", headers=user_headers, files=edited_files)
    assert upload_v1_res.status_code == 200, f"HTTP {upload_v1_res.status_code}: {upload_v1_res.text}"
    v1_data = upload_v1_res.json()
    assert v1_data.get("version") == 1, f"Expected version 1, got {v1_data.get('version')}"
    v1_drive_id = v1_data.get("drive_file_id")
    report("Edited Video v1 Upload", True, f"Uploaded v1 to Google Drive (Filename: {v1_data.get('filename')}, Drive ID: {v1_drive_id})")
except Exception as e:
    report("Edited Video v1 Upload", False, str(e))

# STEP 9: User Submits v1 for Admin Review
print("\n--- STEP 9: User Submits v1 for Admin Review ---")
try:
    submit_res = client.post(f"/api/projects/{project_id}/submit", headers=user_headers, data={"notes": "First complete cut ready for QA."})
    assert submit_res.status_code == 200, f"HTTP {submit_res.status_code}: {submit_res.text}"
    
    # Verify project status is UNDER_REVIEW
    proj_check = supabase.table("projects").select("status").eq("id", project_id).single().execute()
    assert proj_check.data["status"] == "UNDER_REVIEW", f"Expected UNDER_REVIEW, got {proj_check.data['status']}"
    report("User Submit for Review", True, f"Project status transitioned to {proj_check.data['status']}")
except Exception as e:
    report("User Submit for Review", False, str(e))

# STEP 10: Admin Receives Submission and Requests Revision
print("\n--- STEP 10: Admin Reviews v1 & Requests Revision ---")
try:
    # Check admin submissions queue
    sub_queue_res = client.get("/api/admin/submissions", headers=admin_headers)
    assert sub_queue_res.status_code == 200
    submissions = sub_queue_res.json()
    my_sub = next((s for s in submissions if s["project_id"] == project_id), None)
    assert my_sub is not None, "Submission not found in admin queue"
    assert my_sub["version"] == 1, f"Expected version 1 submission, got {my_sub['version']}"

    # Admin requests revision with feedback
    feedback_text = "Please improve the audio synchronization in the final section."
    rev_res = client.post(
        f"/api/projects/{project_id}/review",
        headers=admin_headers,
        data={"action": "REVISION", "notes": feedback_text}
    )
    assert rev_res.status_code == 200, f"HTTP {rev_res.status_code}: {rev_res.text}"
    
    # Verify status is REVISION_REQUIRED
    proj_check2 = supabase.table("projects").select("status, notes").eq("id", project_id).single().execute()
    assert proj_check2.data["status"] == "REVISION_REQUIRED", f"Expected REVISION_REQUIRED, got {proj_check2.data['status']}"
    assert proj_check2.data["notes"] == feedback_text, "Notes mismatch"
    report("Admin Request Revision", True, f"Status: {proj_check2.data['status']}, Feedback: \"{feedback_text}\"")
except Exception as e:
    report("Admin Request Revision", False, str(e))

# STEP 11: User Uploads Revised Video v2 and Resubmits
print("\n--- STEP 11: User Uploads Revised Video v2 & Resubmits ---")
try:
    edited_v2_files = {
        "video": ("Training_Video_Batch_04_v2.mp4", io.BytesIO(MINIMAL_MP4), "video/mp4")
    }
    upload_v2_res = client.post(f"/api/projects/{project_id}/edited-video", headers=user_headers, files=edited_v2_files)
    assert upload_v2_res.status_code == 200
    v2_data = upload_v2_res.json()
    assert v2_data.get("version") == 2, f"Expected version 2, got {v2_data.get('version')}"
    
    # User resubmits
    resubmit_res = client.post(f"/api/projects/{project_id}/submit", headers=user_headers, data={"notes": "Adjusted final section timing."})
    assert resubmit_res.status_code == 200
    
    proj_check3 = supabase.table("projects").select("status").eq("id", project_id).single().execute()
    assert proj_check3.data["status"] == "UNDER_REVIEW"
    report("User Resubmission (v2)", True, f"Uploaded v2 and resubmitted (Status: {proj_check3.data['status']})")
except Exception as e:
    report("User Resubmission (v2)", False, str(e))

# STEP 12: Admin Reviews v2 and Approves Project
print("\n--- STEP 12: Admin Approves Project & Saves Final Video ---")
try:
    approve_res = client.post(
        f"/api/projects/{project_id}/review",
        headers=admin_headers,
        data={"action": "APPROVE"}
    )
    assert approve_res.status_code == 200, f"HTTP {approve_res.status_code}: {approve_res.text}"
    
    # Verify project status is COMPLETED
    proj_check4 = supabase.table("projects").select("status").eq("id", project_id).single().execute()
    assert proj_check4.data["status"] == "COMPLETED", f"Expected COMPLETED, got {proj_check4.data['status']}"
    
    # Verify final_videos table has entry
    final_entry = supabase.table("final_videos").select("*").eq("project_id", project_id).execute()
    assert len(final_entry.data) > 0, "final_videos record not found"
    report("Admin Approval & Final Video Registration", True, f"Project marked {proj_check4.data['status']}, Final video registered in Drive (ID: {final_entry.data[0]['drive_file_id']})")
except Exception as e:
    report("Admin Approval & Final Video Registration", False, str(e))

# STEP 13: Verify User Notifications & Activity Events
print("\n--- STEP 13: Notifications and Activity Events ---")
try:
    user_notifs = supabase.table("notifications").select("*").eq("user_id", user_profile_id).order("created_at", desc=True).execute()
    assert len(user_notifs.data) >= 2, f"Expected at least 2 notifications, found {len(user_notifs.data)}"
    notif_types = [n["type"] for n in user_notifs.data]
    assert "PROJECT_APPROVED" in notif_types, "PROJECT_APPROVED notification missing"
    assert "REVISION_REQUESTED" in notif_types, "REVISION_REQUESTED notification missing"
    
    act_res = client.get("/api/activity", headers=admin_headers)
    assert act_res.status_code == 200, f"Activity endpoint failed: {act_res.status_code}"
    activities = act_res.json()
    assert len(activities) > 0, "No activity events found"
    report("Notifications & Activity Logs", True, f"Found {len(user_notifs.data)} notifications ({', '.join(notif_types[:3])}) and {len(activities)} recent activities")
except Exception as e:
    report("Notifications & Activity Logs", False, str(e))

print("\n==================================================")
print("TEST SUMMARY: ALL 13 END-TO-END WORKFLOW PHASES PASSED!")
print("==================================================")
for k, (s, d) in results.items():
    print(f"  {s}: {k} -> {d}")
