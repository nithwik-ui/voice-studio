from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="VoiceFlow Studio API")

# Support multiple frontend origins (comma-separated in FRONTEND_URL env var)
_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
allowed_origins = [url.strip() for url in _frontend_url.split(",")]
# Always allow localhost for local development
if "http://localhost:3000" not in allowed_origins:
    allowed_origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Routers will be included here
