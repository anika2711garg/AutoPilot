from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api import api_router

app = FastAPI(
    title="Autopilot API",
    description="Backend API for the Autopilot AI Travel SaaS application",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:3000",
    # Add production URL later
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
    return {"message": "Welcome to Autopilot API"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
