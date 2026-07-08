from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.api.api import api_router
from backend.core.db import init_db

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for the Autopilot AI Travel SaaS application",
    version="1.0.0"
)

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    await init_db()

# Mount API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "ready",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "api": "/api/v1",
    }

@app.get("/health")
async def health_check():
    return {
        "service": settings.PROJECT_NAME,
        "status": "ok",
        "version": "1.0.0",
    }
