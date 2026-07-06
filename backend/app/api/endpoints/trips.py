from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List

router = APIRouter()

class TripCreateRequest(BaseModel):
    prompt: str = Field(..., min_length=1)


class TripResponse(BaseModel):
    id: int
    title: str
    destination: str
    dates: str
    budget: str
    status: str
    summary: str


MOCK_TRIPS: List[TripResponse] = [
    TripResponse(
        id=1,
        title="Goa Getaway",
        destination="Goa, India",
        dates="Dec 15 - Dec 20",
        budget="₹38,500",
        status="Planning",
        summary="Beach-focused itinerary with flights, stay, and local transport.",
    ),
    TripResponse(
        id=2,
        title="Tokyo Explorer",
        destination="Tokyo, Japan",
        dates="Mar 08 - Mar 14",
        budget="$2,450",
        status="Ready",
        summary="City break with rail passes, food spots, and hotel shortlist.",
    ),
]


@router.get("/", response_model=list[TripResponse])
async def get_trips():
    return MOCK_TRIPS


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(trip_id: int):
    for trip in MOCK_TRIPS:
        if trip.id == trip_id:
            return trip

    raise HTTPException(status_code=404, detail="Trip not found")


@router.post("/")
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
    }
