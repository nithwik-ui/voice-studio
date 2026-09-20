# VoiceFlow Studio: Deployment, Backup & Recovery Strategy

This document outlines the recommended infrastructure rollout and disaster recovery strategy for VoiceFlow Studio's staging and production environments.

## 1. Environment Segregation

VoiceFlow Studio strictly separates environments to prevent data bleeding.

- **Staging**: Used for QA, UI validation, and user acceptance testing (UAT).
- **Production**: Live environment with strict access controls.

**Never** use Production API keys, Google Drive folders, or Supabase instances in the Staging or Local Development environments.

## 2. Infrastructure Targets

### 2.1 Frontend (Next.js)
- **Recommended Host**: Vercel or AWS Amplify.
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Configuration**: Set all `NEXT_PUBLIC_*` environment variables in the host's dashboard.

### 2.2 Backend (FastAPI)
- **Recommended Host**: Render, AWS Elastic Beanstalk, or Google Cloud Run (Dockerized).
- **Start Command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
- **Configuration**: Securely inject `.env` variables via the host's secrets manager. Ensure CORS policies restrict origins to the deployed Frontend URL.

### 2.3 Worker (Celery & FFmpeg)
- **Recommended Host**: AWS EC2 or Render Background Worker.
- **Dependencies**: The worker environment **must** have `ffmpeg` installed natively (`sudo apt-get install ffmpeg`).
- **Start Command**: `celery -A worker.celery_app worker --loglevel=info`

### 2.4 Database (Supabase)
- Apply `backend/schema.sql` (which includes Row Level Security policies and Performance Indexes) using the Supabase CLI: `supabase db push`.
- Ensure **Realtime** is enabled in the Supabase dashboard for the `notifications` table to allow websockets to function correctly.

---

## 3. Backup and Disaster Recovery

### 3.1 PostgreSQL (Supabase)
- **Strategy**: Enable Supabase's Point-in-Time Recovery (PITR) for the Production environment.
- **Frequency**: Automated daily logical backups (default), supplemented by PITR which allows restoring the database to any minute within the last 7 days.
- **Recovery**: If a catastrophic data loss occurs (e.g., accidental table drop), use the Supabase dashboard to restore the project from the latest available PITR snapshot.

### 3.2 Google Drive Storage
- **Strategy**: Files uploaded to Google Drive are not stored in Supabase (only their metadata is).
- **Isolation**: Use dedicated Google Drive Service Accounts for Staging vs. Production. Do not overlap `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
- **Soft Deletes**: Google Drive places deleted files in the "Trash" for 30 days before permanent deletion.
- **Recovery**: If a user accidentally deletes a project, an Admin can recover the video/recording files directly from the Google Drive Trash via the Drive web interface, then manually update the `status` flag in the Supabase database.

### 3.3 Redis (Celery Broker)
- **Strategy**: Redis is used strictly as a transient message broker for FFmpeg jobs.
- **Persistence**: Configure Redis with AOF (Append Only File) persistence if your hosting provider supports it.
- **Recovery**: If Redis crashes, AOF allows it to replay unacknowledged jobs upon restart. If a job completely fails to process, the Celery worker is configured to retry, or the Admin can trigger a "Re-process" action via the API if the project remains stuck in `IN_PROGRESS` for too long.

---

## 4. Pre-Flight Checklist

Before marking a deployment as "Live", verify the following:

- [ ] `.env` variables are correctly populated without placeholder `<...>` strings.
- [ ] Supabase Authentication is hooked up with Google OAuth (using the correct production redirect URI).
- [ ] RLS policies are active on `projects`, `recordings`, `final_videos`, and `notifications`.
- [ ] The `ffmpeg` binary is accessible in the `$PATH` of the worker instance.
- [ ] No `console.log` statements expose JWTs or API keys.
