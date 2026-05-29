from dotenv import load_dotenv
load_dotenv()  # must run before any other imports that read env vars

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import assets, generate, guidelines, translate, edit
import os

app = FastAPI(
    title="Bike Studio API",
    description="AI-powered bike image generation studio",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure runtime directories exist
os.makedirs("assets/segments", exist_ok=True)
os.makedirs("assets/backgrounds", exist_ok=True)
os.makedirs("data", exist_ok=True)
os.makedirs("outputs", exist_ok=True)
os.makedirs("outputs/base", exist_ok=True)
os.makedirs("outputs/edits", exist_ok=True)

# API routes — must be registered before the catch-all frontend mount
app.mount("/assets",  StaticFiles(directory="assets"),  name="assets")
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

app.include_router(assets.router,    prefix="/api/assets",    tags=["Assets"])
app.include_router(generate.router,  prefix="/api/generate",  tags=["Generate"])
app.include_router(edit.router,      prefix="/api/edit",      tags=["Edit"])
app.include_router(guidelines.router, prefix="/api/guidelines", tags=["Guidelines"])
app.include_router(translate.router, prefix="/api/translate", tags=["Translate"])


@app.get("/healthz", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "Bike Studio API"}


# Serve built React frontend (production / Docker).
# html=True makes it serve index.html for the root and any unmatched path (SPA).
_dist = Path("frontend/dist")
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")
