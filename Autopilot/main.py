from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.api.endpoints.trips import MOCK_TRIPS, TripCreateRequest, TripResponse, TripSummary

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


@app.get("/api/v1")
async def api_root():
    return {
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "trips": "/api/v1/trips",
            "summary": "/api/v1/trips/summary",
            "status": "/api/v1/status",
        },
    }


@app.get("/api/v1/status")
async def api_status():
    return {
        "service": settings.PROJECT_NAME,
        "status": "healthy",
        "version": "1.0.0",
        "environment": "development",
    }


@app.get("/api/v1/trips", response_model=list[TripResponse])
async def get_trips():
    return MOCK_TRIPS


@app.get("/api/v1/trips/summary", response_model=TripSummary)
async def get_trip_summary():
    return TripSummary(
        active_trips=len(MOCK_TRIPS),
        planning_ready=True,
        favorite_destinations=["Goa", "Tokyo", "Bali"],
        quick_tips=[
            "Include dates and budget for sharper recommendations.",
            "Mention trip style like beach, city, or adventure.",
            "Add must-have preferences such as hotel class or flight time.",
        ],
    )


@app.get("/api/v1/trips/{trip_id}", response_model=TripResponse)
async def get_trip(trip_id: int):
    for trip in MOCK_TRIPS:
        if trip.id == trip_id:
            return trip

    raise HTTPException(status_code=404, detail="Trip not found")


@app.post("/api/v1/trips")
async def create_trip(request: TripCreateRequest):
    next_id = max(trip.id for trip in MOCK_TRIPS) + 1 if MOCK_TRIPS else 1
    prompt = request.prompt.strip()

    title = prompt[:1].upper() + prompt[1:40].strip() if prompt else "New Trip"
    destination = "Custom trip"
    if "goa" in prompt.lower():
        destination = "Goa, India"
    elif "tokyo" in prompt.lower():
        destination = "Tokyo, Japan"

    trip = TripResponse(
        id=next_id,
        title=title or "New Trip",
        destination=destination,
        dates="Dates pending",
        budget="Budget pending",
        status="Planning",
        summary=f"Autopilot received your request: {prompt}",
    )
    MOCK_TRIPS.insert(0, trip)

    return {
        "assistant_message": "I received your trip request and created a draft itinerary in the backend.",
        "trip": trip,
        "next_steps": [
            "Review the generated trip card.",
            "Open the trip detail page for itinerary context.",
            "Refine the prompt with dates or budget if needed.",
        ],
        "recommendations": [
            "Add a destination to get a more accurate mock draft.",
            "Specify whether you want the trip to feel relaxed or packed.",
        ],
    }

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
        "routes": {
            "api": "/api/v1",
            "docs": "/docs",
            "openapi": "/openapi.json",
        },
    }
