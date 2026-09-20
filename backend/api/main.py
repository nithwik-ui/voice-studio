import os
import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Header, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pydantic import BaseModel
from supabase import create_client, Client

from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)
load_dotenv()

# Initialize Supabase
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url:
    supabase_url = "https://mock.supabase.co"
    supabase_key = "mock-key"

supabase: Client = create_client(supabase_url, supabase_key)

app = FastAPI(title="VoiceFlow Studio API - Production")

# Support multiple frontend origins (comma-separated in FRONTEND_URL env var)
_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
allowed_origins = [url.strip() for url in _frontend_url.split(",")]
# Always allow localhost for local development
if "http://localhost:3000" not in allowed_origins:
    allowed_origins.append("http://localhost:3000")
if "http://127.0.0.1:3000" not in allowed_origins:
    allowed_origins.append("http://127.0.0.1:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    from .drive import drive_service
except ImportError:
    from drive import drive_service

@app.get("/")
def root():
    return {"message": "VoiceFlow Studio API is running", "docs": "/docs", "health": "/health"}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "voiceflow-studio-api"}

# -------------------------------------------------------------------
# Dependency: Auth verification
# -------------------------------------------------------------------
async def get_current_user(authorization: str = Header(...)):
    """Verifies the JWT token from Supabase"""
    try:
        token = authorization.replace("Bearer ", "")
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid auth token")
        return user_response.user
    except Exception as e:
        print(f"Auth verification failed: {e}")
        raise HTTPException(status_code=401, detail=str(e))

def get_user_profile(auth_user_id: str):
    """Fetches the profile record for the given auth.users.id"""
    res = supabase.table("profiles").select("*").eq("auth_user_id", auth_user_id).execute()
    if not res.data:
        raise HTTPException(status_code=403, detail="User profile not found")
    return res.data[0]

# -------------------------------------------------------------------
# Endpoints: System & Health
# -------------------------------------------------------------------
@app.get("/")
def read_root():
    return {"message": "VoiceFlow Studio API Running"}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "VoiceFlow Studio API", "timestamp": datetime.now(timezone.utc).isoformat()}

# -------------------------------------------------------------------
# Endpoints: User Management (Admin)
# -------------------------------------------------------------------
class UserInvite(BaseModel):
    name: str
    email: str
    password: str
    role: str

@app.post("/api/users/invite")
async def invite_user(invite: UserInvite, user = Depends(get_current_user)):
    """Admin endpoint to create a new user."""
    profile = get_user_profile(user.id)
    if profile.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
        
    try:
        user_response = supabase.auth.admin.create_user({
            "email": invite.email,
            "password": invite.password,
            "email_confirm": True
        })
        user_id = user_response.user.id
        
        # Insert profile
        new_profile = supabase.table("profiles").insert({
            "auth_user_id": user_id,
            "email": invite.email,
            "full_name": invite.name,
            "username": invite.email.split("@")[0],
            "role": invite.role,
            "status": "ACTIVE"
        }).execute()
        
        # Activity event
        try:
            supabase.table("activity_events").insert({
                "actor_id": profile["id"],
                "action": f"Created user account for '{invite.name}' ({invite.email})",
                "entity_type": "PROJECT",
                "entity_id": new_profile.data[0]["id"]
            }).execute()
        except Exception:
            pass
        
        return {"status": "success", "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/users")
async def list_users(user = Depends(get_current_user)):
    """Lists users for project assignment or admin user management."""
    profile = get_user_profile(user.id)
    if profile.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    res = supabase.table("profiles").select("*").order("created_at", desc=True).execute()
    return res.data

# -------------------------------------------------------------------
# Endpoints: Storage & Google Drive
# -------------------------------------------------------------------
@app.get("/api/storage/usage")
async def get_storage_stats(user = Depends(get_current_user)):
    return await drive_service.get_storage_usage()

@app.post("/api/storage/test")
async def test_storage_connection(user = Depends(get_current_user)):
    profile = get_user_profile(user.id)
    if profile.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    usage = await drive_service.get_storage_usage()
    return {
        "status": "success",
        "message": "Google Drive connection verified successfully",
        "details": usage
    }

@app.get("/api/drive/videos")
async def list_drive_videos_endpoint(user = Depends(get_current_user)):
    """
    Returns video files available in Google Drive for import into VoiceFlow projects.
    """
    profile = get_user_profile(user.id)
    if profile.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    return await drive_service.list_drive_videos(page_size=100)

@app.get("/api/drive/folders")
async def list_drive_folders_endpoint(user = Depends(get_current_user)):
    """
    Returns folders available in Google Drive for assigning as Folder Projects.
    """
    profile = get_user_profile(user.id)
    if profile.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    return await drive_service.list_drive_folders(page_size=100)

class ProjectCreateFromDrive(BaseModel):
    title: str
    drive_file_id: str
    original_filename: str
    assigned_user_id: Optional[str] = None
    instructions: Optional[str] = None
    file_size_bytes: Optional[int] = 0

class ProjectCreateFromFolderDrive(BaseModel):
    title: str
    drive_folder_id: str
    assigned_user_id: Optional[str] = None
    instructions: Optional[str] = None

@app.post("/api/projects/create-from-drive")
async def create_project_from_drive(
    payload: ProjectCreateFromDrive,
    user = Depends(get_current_user)
):
    """
    Creates a new project directly from an existing video in Google Drive.
    """
    profile = get_user_profile(user.id)
    if profile.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
        
    # 1. Create Video Record in Supabase
    video_record = supabase.table("videos").insert({
        "name": payload.title,
        "original_filename": payload.original_filename,
        "drive_file_id": payload.drive_file_id,
        "drive_folder_id": "VoiceFlow Studio",
        "mime_type": "video/mp4",
        "created_by": profile["id"],
        "status": "COMPLETED"
    }).execute()
    
    if not video_record.data:
        raise HTTPException(status_code=500, detail="Failed to create video record in database")
        
    video_id = video_record.data[0]["id"]
    
    # 2. Setup project folder hierarchy in Google Drive
    try:
        await drive_service.get_or_create_project_folders(payload.title)
    except Exception as e:
        print(f"Drive folder creation notice: {e}")
        
    # 3. Resolve target assigned profile ID
    target_assigned_profile_id = None
    if payload.assigned_user_id and payload.assigned_user_id != "unassigned":
        try:
            ap = supabase.table("profiles").select("id").or_(f"id.eq.{payload.assigned_user_id},auth_user_id.eq.{payload.assigned_user_id}").execute()
            if ap.data:
                target_assigned_profile_id = ap.data[0]["id"]
        except Exception:
            pass

    # 4. Create Project Record in Supabase
    status = "ASSIGNED" if target_assigned_profile_id else "DRAFT"
    project_payload = {
        "name": payload.title,
        "video_id": video_id,
        "status": status,
        "notes": payload.instructions,
        "created_by": profile["id"]
    }
    if target_assigned_profile_id:
        project_payload["assigned_user_id"] = target_assigned_profile_id
        
    project_record = supabase.table("projects").insert(project_payload).execute()
    if not project_record.data:
        raise HTTPException(status_code=500, detail="Failed to create project record in database")
        
    project = project_record.data[0]
    project_id = project["id"]
    
    # 5. Notify assigned talent
    if target_assigned_profile_id:
        try:
            supabase.table("notifications").insert({
                "user_id": target_assigned_profile_id,
                "type": "PROJECT_ASSIGNED",
                "title": "New Project Assigned",
                "message": f"You have been assigned to project '{payload.title}'.",
                "entity_type": "PROJECT",
                "entity_id": project_id,
                "read": False
            }).execute()
        except Exception as e:
            print(f"Notification error: {e}")

    # 6. Activity event
    try:
        supabase.table("activity_events").insert({
            "actor_id": profile["id"],
            "action": f"Imported video '{payload.original_filename}' from Google Drive and created project '{payload.title}'",
            "entity_type": "PROJECT",
            "entity_id": project_id
        }).execute()
    except Exception:
        pass
        
    return {
        "status": "success",
        "project": project,
        "video": video_record.data[0]
    }

@app.post("/api/projects/create-folder-project")
async def create_folder_project_from_drive(
    payload: ProjectCreateFromFolderDrive,
    user = Depends(get_current_user)
):
    """
    Creates a new project directly from an existing Google Drive Folder.
    """
    profile = get_user_profile(user.id)
    if profile.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
        
    # 1. Setup project folder hierarchy in Google Drive
    try:
        await drive_service.get_or_create_project_folders(payload.title)
    except Exception as e:
        print(f"Drive folder creation notice: {e}")
        
    # 2. Resolve target assigned profile ID
    target_assigned_profile_id = None
    if payload.assigned_user_id and payload.assigned_user_id != "unassigned":
        try:
            ap = supabase.table("profiles").select("id").or_(f"id.eq.{payload.assigned_user_id},auth_user_id.eq.{payload.assigned_user_id}").execute()
            if ap.data:
                target_assigned_profile_id = ap.data[0]["id"]
        except Exception:
            pass

    # 3. Create Project Record in Supabase
    status = "ASSIGNED" if target_assigned_profile_id else "DRAFT"
    project_payload = {
        "name": payload.title,
        "is_folder_project": True,
        "source_drive_folder_id": payload.drive_folder_id,
        "status": status,
        "notes": payload.instructions,
        "created_by": profile["id"]
    }
    if target_assigned_profile_id:
        project_payload["assigned_user_id"] = target_assigned_profile_id
        
    project_record = supabase.table("projects").insert(project_payload).execute()
    if not project_record.data:
        raise HTTPException(status_code=500, detail="Failed to create project record in database")
        
    project = project_record.data[0]
    project_id = project["id"]
    
    # 4. Notify assigned talent
    if target_assigned_profile_id:
        try:
            supabase.table("notifications").insert({
                "user_id": target_assigned_profile_id,
                "type": "PROJECT_ASSIGNED",
                "title": "New Folder Project Assigned",
                "message": f"You have been assigned to folder project '{payload.title}'.",
                "entity_type": "PROJECT",
                "entity_id": project_id,
                "read": False
            }).execute()
        except Exception as e:
            print(f"Notification error: {e}")

    # 5. Activity event
    try:
        supabase.table("activity_events").insert({
            "actor_id": profile["id"],
            "action": f"Imported folder from Google Drive and created project '{payload.title}'",
            "entity_type": "PROJECT",
            "entity_id": project_id
        }).execute()
    except Exception:
        pass
        
    return {
        "status": "success",
        "project": project
    }

@app.get("/api/projects/export-all")
async def export_all_projects(user = Depends(get_current_user)):
    """
    Exports full project manifest including all assets, Google Drive file IDs,
    direct Google Drive URLs, and production status.
    """
    profile = get_user_profile(user.id)
    if profile.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
        
    projects_res = supabase.table("projects").select("*, videos(*), profiles:assigned_user_id(*)").order("created_at", desc=True).execute()
    projects = projects_res.data or []
    
    export_data = []
    for p in projects:
        p_id = p["id"]
        files = supabase.table("project_files").select("*").eq("project_id", p_id).order("version", desc=True).execute().data or []
        recordings = supabase.table("recordings").select("*").eq("project_id", p_id).order("created_at", desc=True).execute().data or []
        final_v = supabase.table("final_videos").select("*").eq("project_id", p_id).execute().data or []
        submissions = supabase.table("submissions").select("*").eq("project_id", p_id).order("submitted_at", desc=True).execute().data or []
        
        orig_video = p.get("videos") or {}
        orig_drive_id = orig_video.get("drive_file_id")
        
        export_data.append({
            "project_id": p_id,
            "project_name": p.get("name"),
            "status": p.get("status"),
            "assigned_user": p.get("profiles", {}).get("full_name") if p.get("profiles") else "Unassigned",
            "assigned_email": p.get("profiles", {}).get("email") if p.get("profiles") else None,
            "created_at": p.get("created_at"),
            "updated_at": p.get("updated_at"),
            "original_video": {
                "name": orig_video.get("name"),
                "filename": orig_video.get("original_filename"),
                "drive_file_id": orig_drive_id,
                "drive_url": f"https://drive.google.com/file/d/{orig_drive_id}/view" if orig_drive_id else None,
                "stream_url": f"http://localhost:8000/api/videos/{orig_drive_id}/stream" if orig_drive_id else None
            },
            "edited_versions_count": len(files),
            "edited_videos": [
                {
                    "version": f.get("version"),
                    "filename": f.get("filename"),
                    "drive_file_id": f.get("drive_file_id"),
                    "drive_url": f"https://drive.google.com/file/d/{f.get('drive_file_id')}/view" if f.get("drive_file_id") else None
                }
                for f in files
            ],
            "recordings_count": len(recordings),
            "recordings": [
                {
                    "filename": r.get("filename"),
                    "drive_file_id": r.get("drive_file_id"),
                    "drive_url": f"https://drive.google.com/file/d/{r.get('drive_file_id')}/view" if r.get("drive_file_id") else None
                }
                for r in recordings
            ],
            "final_deliverable": {
                "filename": final_v[0].get("filename") if final_v else None,
                "drive_file_id": final_v[0].get("drive_file_id") if final_v else None,
                "drive_url": f"https://drive.google.com/file/d/{final_v[0].get('drive_file_id')}/view" if (final_v and final_v[0].get("drive_file_id")) else None
            } if final_v else None,
            "submissions_count": len(submissions)
        })
        
    return {
        "status": "success",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_projects": len(export_data),
        "workspace_root": "VoiceFlow Studio",
        "account": "chandanalareethika123@gmail.com",
        "projects": export_data
    }

# -------------------------------------------------------------------
# Endpoints: Projects & Workflow
# -------------------------------------------------------------------
@app.get("/api/projects")
async def get_projects(user = Depends(get_current_user)):
    profile = get_user_profile(user.id)
    is_admin = profile.get("role") == "ADMIN"
    
    if is_admin:
        projects = supabase.table("projects").select(
            "*, videos(*), profiles:assigned_user_id(*)"
        ).order("created_at", desc=True).execute()
    else:
        projects = supabase.table("projects").select(
            "*, videos(*), profiles:assigned_user_id(*)"
        ).eq("assigned_user_id", profile["id"]).order("created_at", desc=True).execute()
        
    return projects.data

@app.get("/api/projects/{project_id}")
async def get_project_details(project_id: str, user = Depends(get_current_user)):
    profile = get_user_profile(user.id)
    is_admin = profile.get("role") == "ADMIN"
    
    project_res = supabase.table("projects").select(
        "*, videos(*), profiles:assigned_user_id(*)"
    ).eq("id", project_id).execute()
    
    if not project_res.data:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project = project_res.data[0]
    if not is_admin and project.get("assigned_user_id") != profile["id"]:
        raise HTTPException(status_code=403, detail="You do not have access to this project")
        
    return project

@app.get("/api/projects/{project_id}/folder-videos")
async def get_project_folder_videos(project_id: str, user = Depends(get_current_user)):
    """
    Returns the list of videos inside the assigned Google Drive folder for this project.
    """
    profile = get_user_profile(user.id)
    is_admin = profile.get("role") == "ADMIN"
    
    project_res = supabase.table("projects").select("*").eq("id", project_id).execute()
    if not project_res.data:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project = project_res.data[0]
    if not is_admin and project.get("assigned_user_id") != profile["id"]:
        raise HTTPException(status_code=403, detail="You do not have access to this project")
        
    if not project.get("is_folder_project") or not project.get("source_drive_folder_id"):
        return []
        
    return await drive_service.list_videos_in_folder(project.get("source_drive_folder_id"))

@app.get("/api/projects/{project_id}/files")
async def get_project_files(project_id: str, user = Depends(get_current_user)):
    """
    Returns full file and submission history for the project:
    original video, edited videos (v1, v2, ...), recordings, submissions, and final video.
    """
    profile = get_user_profile(user.id)
    is_admin = profile.get("role") == "ADMIN"
    
    project_res = supabase.table("projects").select("*, videos(*)").eq("id", project_id).execute()
    if not project_res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    project = project_res.data[0]
    if not is_admin and project.get("assigned_user_id") != profile["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Edited videos
    edited_files = supabase.table("project_files").select("*").eq("project_id", project_id).order("version", desc=True).execute()
    
    # Recordings
    recordings = supabase.table("recordings").select("*").eq("project_id", project_id).order("created_at", desc=True).execute()
    
    # Submissions with reviews
    submissions = supabase.table("submissions").select("*, revision_requests(*)").eq("project_id", project_id).order("submitted_at", desc=True).execute()
    
    # Final video
    final = supabase.table("final_videos").select("*").eq("project_id", project_id).execute()

    return {
        "project": project,
        "original_video": project.get("videos"),
        "edited_videos": edited_files.data or [],
        "recordings": recordings.data or [],
        "submissions": submissions.data or [],
        "final_video": final.data[0] if final.data else None
    }

@app.post("/api/videos/upload")
async def upload_admin_video(
    title: str = Form(...),
    video: UploadFile = File(...),
    assigned_user_id: Optional[str] = Form(None),
    instructions: Optional[str] = Form(None),
    user = Depends(get_current_user)
):
    """
    Uploads a source video to Google Drive and creates a Project in Supabase.
    """
    profile = get_user_profile(user.id)
    if profile.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
        
    # 1. Upload to Drive
    try:
        drive_file_id = await drive_service.upload_video(video.file, video.filename, video.content_type)
    except Exception as e:
        print(f"Drive upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Google Drive upload failed: {str(e)}")
    
    # 2. Create Video Record
    video_record = supabase.table("videos").insert({
        "name": title,
        "original_filename": video.filename,
        "drive_file_id": drive_file_id,
        "drive_folder_id": "VoiceFlow Studio",
        "mime_type": video.content_type or "video/mp4",
        "created_by": profile["id"],
        "status": "COMPLETED"
    }).execute()
    
    video_id = video_record.data[0]["id"]
    
    # Resolve target assigned profile ID
    target_assigned_profile_id = None
    if assigned_user_id and assigned_user_id != "unassigned":
        try:
            ap = supabase.table("profiles").select("id").or_(f"id.eq.{assigned_user_id},auth_user_id.eq.{assigned_user_id}").execute()
            if ap.data:
                target_assigned_profile_id = ap.data[0]["id"]
        except Exception:
            pass

    # 3. Create Project Record
    status = "ASSIGNED" if target_assigned_profile_id else "DRAFT"
    project_payload = {
        "name": title,
        "video_id": video_id,
        "status": status,
        "notes": instructions,
        "created_by": profile["id"]
    }
    if target_assigned_profile_id:
        project_payload["assigned_user_id"] = target_assigned_profile_id
        
    project_record = supabase.table("projects").insert(project_payload).execute()
    project_id = project_record.data[0]["id"]
    
    # 4. Notify assigned user
    if target_assigned_profile_id:
        try:
            supabase.table("notifications").insert({
                "user_id": target_assigned_profile_id,
                "type": "PROJECT_ASSIGNED",
                "title": "New Project Assigned",
                "message": f"You have been assigned to project '{title}'.",
                "entity_type": "PROJECT",
                "entity_id": project_id,
                "read": False
            }).execute()
        except Exception as e:
            print(f"Notification error: {e}")

    # 5. Activity event
    try:
        supabase.table("activity_events").insert({
            "actor_id": profile["id"],
            "action": f"Uploaded video and created project '{title}'",
            "entity_type": "PROJECT",
            "entity_id": project_id
        }).execute()
    except Exception as e:
        print(f"Activity event failed: {e}")
        
    return {
        "status": "success",
        "project": project_record.data[0]
    }

# -------------------------------------------------------------------
# Video Streaming Proxy (Authorized)
# -------------------------------------------------------------------
@app.get("/api/videos/{drive_file_id}/stream")
async def stream_video(drive_file_id: str, request: Request):
    """Streams a video from Google Drive by proxying the request."""
    creds = drive_service._get_credentials()
    if not creds:
        raise HTTPException(status_code=404, detail="Drive credentials not configured")
        
    if creds.expired and creds.refresh_token:
        from google.auth.transport.requests import Request as GoogleRequest
        creds.refresh(GoogleRequest())
        
    url = f"https://www.googleapis.com/drive/v3/files/{drive_file_id}?alt=media"
    headers = {"Authorization": f"Bearer {creds.token}"}
    if "range" in request.headers:
        headers["Range"] = request.headers["range"]
        
    client = httpx.AsyncClient()
    req = client.build_request("GET", url, headers=headers)
    response = await client.send(req, stream=True)
    
    resp_headers = {}
    for k, v in response.headers.items():
        if k.lower() in ["content-type", "content-length", "content-range", "accept-ranges"]:
            resp_headers[k] = v
            
    async def generate():
        try:
            async for chunk in response.aiter_bytes(chunk_size=1024*1024):
                yield chunk
        finally:
            await response.aclose()
            await client.aclose()
            
    return StreamingResponse(
        generate(),
        status_code=response.status_code,
        headers=resp_headers
    )

# -------------------------------------------------------------------
# Voice-Over Recording Upload
# -------------------------------------------------------------------
@app.post("/api/projects/{project_id}/record")
async def upload_project_audio(
    project_id: str,
    audio: UploadFile = File(...),
    source_drive_file_id: Optional[str] = Form(None),
    source_filename: Optional[str] = Form(None),
    user = Depends(get_current_user)
):
    """
    Saves the complete voice-over recording to Google Drive and updates the DB.
    """
    profile = get_user_profile(user.id)
    is_admin = profile.get("role") == "ADMIN"
    
    project = supabase.table("projects").select("*").eq("id", project_id).execute()
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = project.data[0]
    
    if not is_admin and proj.get("assigned_user_id") != profile["id"]:
        raise HTTPException(status_code=403, detail="Not assigned to this project")
        
    # Upload to Google Drive project recordings folder
    drive_file_id = await drive_service.upload_recording(audio.file, audio.filename or "recording.webm", audio.content_type, proj["name"])
    
    # Create Recording Record
    recording_data = {
        "project_id": project_id,
        "user_id": profile["id"],
        "drive_file_id": drive_file_id,
        "source_drive_file_id": source_drive_file_id,
        "source_filename": source_filename,
        "mime_type": audio.content_type or "audio/webm",
        "status": "COMPLETED"
    }
    
    recording = supabase.table("recordings").insert(recording_data).execute()
    recording_id = recording.data[0]["id"]
    
    # Update Project Status to IN_PROGRESS if DRAFT or ASSIGNED
    if proj.get("status") in ["DRAFT", "ASSIGNED"]:
        supabase.table("projects").update({"status": "IN_PROGRESS"}).eq("id", project_id).execute()
    
    # Activity event
    try:
        supabase.table("activity_events").insert({
            "actor_id": profile["id"],
            "action": f"Saved voice-over recording for '{proj['name']}'",
            "entity_type": "RECORDING",
            "entity_id": recording_id
        }).execute()
    except Exception:
        pass
        
    return {
        "status": "success",
        "recording_id": recording_id,
        "drive_file_id": drive_file_id
    }

# -------------------------------------------------------------------
# Edited Video Upload & Versioning
# -------------------------------------------------------------------
@app.post("/api/projects/{project_id}/edited-video")
async def upload_edited_video(
    project_id: str,
    video: UploadFile = File(...),
    user = Depends(get_current_user)
):
    """
    Uploads an edited video (v1, v2, v3, ...) from an external editor into
    VoiceFlow Studio/Projects/{Project Name}/Edited Videos/
    and records metadata in project_files.
    """
    profile = get_user_profile(user.id)
    is_admin = profile.get("role") == "ADMIN"
    
    project_res = supabase.table("projects").select("*").eq("id", project_id).execute()
    if not project_res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    project = project_res.data[0]
    
    if not is_admin and project.get("assigned_user_id") != profile["id"]:
        raise HTTPException(status_code=403, detail="Not assigned to this project")
        
    # Determine version number (v1, v2, v3, ...)
    existing_files = supabase.table("project_files").select("version").eq("project_id", project_id).order("version", desc=True).limit(1).execute()
    next_version = 1
    if existing_files.data:
        next_version = (existing_files.data[0].get("version") or 0) + 1
        
    sanitized_name = project["name"].replace(" ", "_")
    filename = f"{sanitized_name}_v{next_version}.mp4"
    
    # Upload to Google Drive under Projects/{project_name}/Edited Videos/
    try:
        drive_file_id = await drive_service.upload_edited_video(
            video.file, filename, video.content_type or "video/mp4", project["name"]
        )
    except Exception as e:
        print(f"Error uploading edited video to Drive: {e}")
        raise HTTPException(status_code=500, detail=f"Drive upload failed: {str(e)}")
        
    # Read file size
    file_size = None
    try:
        video.file.seek(0, 2)
        file_size = video.file.tell()
    except Exception:
        pass
        
    # Insert project_files record
    project_file = supabase.table("project_files").insert({
        "project_id": project_id,
        "uploaded_by": profile["id"],
        "drive_file_id": drive_file_id,
        "drive_folder_id": "Edited Videos",
        "filename": filename,
        "mime_type": video.content_type or "video/mp4",
        "size": file_size,
        "version": next_version,
        "type": "EDITED_VIDEO"
    }).execute()
    
    # Update project status
    supabase.table("projects").update({"status": "EDITED_VIDEO_UPLOADED"}).eq("id", project_id).execute()
    
    # Activity event
    try:
        supabase.table("activity_events").insert({
            "actor_id": profile["id"],
            "action": f"Uploaded edited video v{next_version} for '{project['name']}'",
            "entity_type": "PROJECT",
            "entity_id": project_id
        }).execute()
    except Exception:
        pass
        
    return {
        "status": "success",
        "file": project_file.data[0],
        "version": next_version,
        "filename": filename,
        "drive_file_id": drive_file_id
    }

# -------------------------------------------------------------------
# Submit Project for Admin Review
# -------------------------------------------------------------------
@app.post("/api/projects/{project_id}/submit")
async def submit_project(
    project_id: str,
    notes: Optional[str] = Form(None),
    user = Depends(get_current_user)
):
    """
    Submits a project for Admin review.
    Creates a submission record and sends notification to Admin.
    """
    profile = get_user_profile(user.id)
    is_admin = profile.get("role") == "ADMIN"
    
    project_res = supabase.table("projects").select("*").eq("id", project_id).execute()
    if not project_res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    project = project_res.data[0]
    
    if not is_admin and project.get("assigned_user_id") != profile["id"]:
        raise HTTPException(status_code=403, detail="Not assigned to this project")
        
    # Find latest edited video
    latest_file = supabase.table("project_files").select("*").eq("project_id", project_id).order("version", desc=True).limit(1).execute()
    version = 1
    drive_file_id = None
    if latest_file.data:
        version = latest_file.data[0]["version"]
        drive_file_id = latest_file.data[0]["drive_file_id"]
    else:
        # Fallback to recording or original video
        rec = supabase.table("recordings").select("*").eq("project_id", project_id).order("created_at", desc=True).limit(1).execute()
        if rec.data:
            drive_file_id = rec.data[0]["drive_file_id"]

    # Update Project Status to UNDER_REVIEW (or RESUBMITTED if revision was requested)
    supabase.table("projects").update({"status": "UNDER_REVIEW"}).eq("id", project_id).execute()
    
    # Create Submission Record
    submission = supabase.table("submissions").insert({
        "project_id": project_id,
        "submitted_by": profile["id"],
        "status": "PENDING",
        "version": version,
        "drive_file_id": drive_file_id,
        "notes": notes
    }).execute()
    
    # Notify Admin(s)
    try:
        admins = supabase.table("profiles").select("id").eq("role", "ADMIN").execute()
        for admin in (admins.data or []):
            supabase.table("notifications").insert({
                "user_id": admin["id"],
                "type": "SUBMISSION_RECEIVED",
                "title": "Project Submitted for Review",
                "message": f"'{project['name']}' (v{version}) was submitted for review by {profile['full_name']}.",
                "entity_type": "PROJECT",
                "entity_id": project_id,
                "read": False
            }).execute()
    except Exception as e:
        print(f"Admin notification failed: {e}")

    # Activity event
    try:
        supabase.table("activity_events").insert({
            "actor_id": profile["id"],
            "action": f"Submitted '{project['name']}' (v{version}) for review",
            "entity_type": "SUBMISSION",
            "entity_id": submission.data[0]["id"]
        }).execute()
    except Exception:
        pass
        
    return {"status": "success", "submission": submission.data[0]}

# -------------------------------------------------------------------
# Admin Review: Approve or Request Revision
# -------------------------------------------------------------------
@app.post("/api/projects/{project_id}/review")
async def review_project(
    project_id: str,
    action: str = Form(...), # "APPROVE" or "REVISION"
    notes: Optional[str] = Form(None),
    user = Depends(get_current_user)
):
    """
    Admin endpoint to approve or request revision on a project.
    """
    profile = get_user_profile(user.id)
    if profile.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
        
    project_res = supabase.table("projects").select("*").eq("id", project_id).execute()
    if not project_res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    project = project_res.data[0]
    
    submission_res = supabase.table("submissions").select("*").eq("project_id", project_id).order("submitted_at", desc=True).limit(1).execute()
    submission = submission_res.data[0] if submission_res.data else None
    submission_id = submission["id"] if submission else None

    assigned_user_id = project.get("assigned_user_id")

    if action == "APPROVE":
        # 1. Update Project Status to COMPLETED / APPROVED
        supabase.table("projects").update({"status": "COMPLETED"}).eq("id", project_id).execute()
        
        # 2. Update Submission Record
        if submission_id:
            supabase.table("submissions").update({
                "status": "APPROVED",
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_by": profile["id"]
            }).eq("id", submission_id).execute()

        # 3. Copy to Final Videos in Google Drive
        final_drive_id = None
        source_drive_id = submission.get("drive_file_id") if submission else None
        if not source_drive_id:
            # Fallback to latest edited video
            ef = supabase.table("project_files").select("drive_file_id").eq("project_id", project_id).order("version", desc=True).limit(1).execute()
            if ef.data:
                source_drive_id = ef.data[0]["drive_file_id"]

        if not source_drive_id and project.get("video_id"):
            # Fallback to source video
            vf = supabase.table("videos").select("drive_file_id").eq("id", project["video_id"]).execute()
            if vf.data:
                source_drive_id = vf.data[0]["drive_file_id"]

        if source_drive_id:
            try:
                final_name = f"{project['name']}_FINAL.mp4"
                final_drive_id = await drive_service.copy_to_final(source_drive_id, final_name, project["name"])
            except Exception as e:
                print(f"Notice: Using source drive ID directly for final: {e}")
                final_drive_id = source_drive_id
        
        final_file_id = final_drive_id or source_drive_id or "final_drive_completed"

        # 4. Insert Final Video record
        supabase.table("final_videos").insert({
            "project_id": project_id,
            "drive_file_id": final_file_id,
            "status": "COMPLETED",
            "version": submission.get("version", 1) if submission else 1
        }).execute()

        # 5. User Notification
        if assigned_user_id:
            try:
                supabase.table("notifications").insert({
                    "user_id": assigned_user_id,
                    "type": "PROJECT_APPROVED",
                    "title": "Project Approved!",
                    "message": f"Your project '{project['name']}' has been approved by the Admin and marked completed.",
                    "entity_type": "PROJECT",
                    "entity_id": project_id,
                    "read": False
                }).execute()
            except Exception as e:
                print(f"Notification error: {e}")

        # 6. Activity Event
        try:
            supabase.table("activity_events").insert({
                "actor_id": profile["id"],
                "action": f"Approved project '{project['name']}' and registered final delivery",
                "entity_type": "PROJECT",
                "entity_id": project_id
            }).execute()
        except Exception:
            pass

    elif action == "REVISION":
        if not notes or not notes.strip():
            raise HTTPException(status_code=400, detail="Notes are required when requesting a revision")
            
        # 1. Update Project Status to REVISION_REQUIRED
        supabase.table("projects").update({
            "status": "REVISION_REQUIRED",
            "notes": notes
        }).eq("id", project_id).execute()
        
        # 2. Update Submission
        if submission_id:
            supabase.table("submissions").update({
                "status": "REVISION_REQUESTED",
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_by": profile["id"]
            }).eq("id", submission_id).execute()
            
            # 3. Create Revision Request Record
            supabase.table("revision_requests").insert({
                "submission_id": submission_id,
                "created_by": profile["id"],
                "message": notes,
                "status": "REVISION_REQUIRED"
            }).execute()

        # 4. User Notification
        if assigned_user_id:
            try:
                supabase.table("notifications").insert({
                    "user_id": assigned_user_id,
                    "type": "REVISION_REQUESTED",
                    "title": "Revision Required",
                    "message": f"Admin requested revisions on '{project['name']}': \"{notes}\"",
                    "entity_type": "PROJECT",
                    "entity_id": project_id,
                    "read": False
                }).execute()
            except Exception as e:
                print(f"Notification error: {e}")

        # 5. Activity Event
        try:
            supabase.table("activity_events").insert({
                "actor_id": profile["id"],
                "action": f"Requested revision on '{project['name']}': {notes}",
                "entity_type": "REVISION",
                "entity_id": submission_id or project_id
            }).execute()
        except Exception:
            pass

    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'APPROVE' or 'REVISION'")
        
    return {"status": "success", "action": action}

# -------------------------------------------------------------------
# Admin Submissions Queue
# -------------------------------------------------------------------
@app.get("/api/admin/submissions")
async def list_admin_submissions(user = Depends(get_current_user)):
    profile = get_user_profile(user.id)
    if profile.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
        
    submissions = supabase.table("submissions").select(
        "*, projects(*, profiles:assigned_user_id(*), videos(*)), profiles:submitted_by(*), revision_requests(*)"
    ).order("submitted_at", desc=True).execute()
    
    return submissions.data

# -------------------------------------------------------------------
# Activity Events
# -------------------------------------------------------------------
@app.get("/api/activity")
async def get_activity(user = Depends(get_current_user)):
    profile = get_user_profile(user.id)
    is_admin = profile.get("role") == "ADMIN"
    
    if is_admin:
        events = supabase.table("activity_events").select(
            "*, profiles:actor_id(*)"
        ).order("created_at", desc=True).limit(20).execute()
    else:
        events = supabase.table("activity_events").select(
            "*, profiles:actor_id(*)"
        ).eq("actor_id", profile["id"]).order("created_at", desc=True).limit(20).execute()
        
    return events.data

# -------------------------------------------------------------------
# Settings & Preferences
# -------------------------------------------------------------------
class SettingsUpdate(BaseModel):
    settings: dict

@app.get("/api/settings")
async def get_settings(user = Depends(get_current_user)):
    try:
        res = supabase.table("settings").select("*").execute()
        settings_dict = {row["key"]: row["value"] for row in (res.data or [])}
    except Exception:
        settings_dict = {}
        
    creds = drive_service._get_credentials()
    return {
        "settings": settings_dict,
        "drive_configured": bool(creds and creds.valid),
        "drive_root": "VoiceFlow Studio",
        "api_url": "http://localhost:8000"
    }

@app.post("/api/settings")
async def update_settings(payload: SettingsUpdate, user = Depends(get_current_user)):
    profile = get_user_profile(user.id)
    if profile.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
        
    for k, v in payload.settings.items():
        supabase.table("settings").upsert({
            "key": k,
            "value": v,
            "updated_at": "now()"
        }, on_conflict="key").execute()
        
    return {"status": "success"}
