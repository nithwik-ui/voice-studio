import os
import subprocess
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "worker",
    broker=redis_url,
    backend=redis_url
)

celery_app.conf.task_routes = {
    "worker.process_final_video": "main-queue"
}

@celery_app.task
def process_final_video(project_id: str, original_video_path: str, recording_audio_path: str):
    """
    Merges the original MP4 with the user's WebM voice recording.
    Uses -c:v copy to preserve original video quality and framerate.
    """
    print(f"Starting processing for project: {project_id}")
    
    output_path = f"/tmp/final_{project_id}.mp4"
    
    # FFmpeg command:
    # -i original_video_path
    # -i recording_audio_path
    # -c:v copy (preserve video)
    # -map 0:v:0 (take video from first input)
    # -map 1:a:0 (take audio from second input)
    # -shortest (end when the shortest stream ends - usually the recording)
    
    cmd = [
        "ffmpeg", "-y",
        "-i", original_video_path,
        "-i", recording_audio_path,
        "-c:v", "copy",
        "-c:a", "aac",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-shortest",
        output_path
    ]
    
    try:
        process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        if process.returncode != 0:
            print(f"FFmpeg Error for {project_id}:\n{process.stderr}")
            return {"status": "failed", "project_id": project_id, "error": process.stderr}
            
        print(f"Successfully generated final video for {project_id} at {output_path}")
        
        # In a full production environment, this is where we would upload output_path
        # to Google Drive (VoiceFlow Studio/Final Videos/Project-{id})
        # and update the Supabase 'final_videos' table.
        
        return {"status": "success", "project_id": project_id, "output_path": output_path}
        
    except Exception as e:
        print(f"Worker exception: {str(e)}")
        return {"status": "failed", "project_id": project_id, "error": str(e)}
