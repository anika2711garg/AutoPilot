from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api import api_router

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

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "ready",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }

@app.get("/health")
async def health_check():
    return {
        "service": settings.PROJECT_NAME,
        "status": "ok",
        "version": "1.0.0",
        "routes": {
            "api": "/api/v1",
            "docs": "/docs",
            "openapi": "/openapi.json",
        },
    }
