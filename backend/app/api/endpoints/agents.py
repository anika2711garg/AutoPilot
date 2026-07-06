from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
import asyncio

router = APIRouter()

async def mock_agent_stream():
    steps = [
        {"status": "Planning...", "agent": "Supervisor"},
        {"status": "Finding flights...", "agent": "Transport Agent"},
        {"status": "Searching hotels...", "agent": "Accommodation Agent"},
        {"status": "Optimizing budget...", "agent": "Budget Agent"},
        {"status": "Building itinerary...", "agent": "Itinerary Agent"},
        {"status": "Done.", "agent": "Supervisor"}
    ]
    for step in steps:
        await asyncio.sleep(1.5)
        yield dict(data=str(step))

@router.get("/stream/{trip_id}")
async def stream_agent_progress(trip_id: int):
    # This will stream real LangGraph execution in the future
    return EventSourceResponse(mock_agent_stream())
