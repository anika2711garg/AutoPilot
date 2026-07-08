import json
import asyncio
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from sqlalchemy import select

from backend.core.db import SessionLocal
from backend.models.trip import Event

router = APIRouter()

async def database_agent_stream(trip_id: int):
    last_event_id = 0
    active = True
    
    while active:
        async with SessionLocal() as db:
            result = await db.execute(
                select(Event)
                .where(Event.trip_id == trip_id)
                .where(Event.id > last_event_id)
                .order_by(Event.id.asc())
            )
            events = result.scalars().all()
            
            for event in events:
                last_event_id = event.id
                payload = {
                    "id": event.id,
                    "type": event.type,
                    "data": event.data_json,
                    "at": event.at.isoformat()
                }
                yield dict(data=json.dumps(payload))
                
                # Terminate stream on workflow end states
                if event.type in ["agent_end", "saga_end", "saga_rollback_completed", "agent_error"]:
                    active = False
                    
        await asyncio.sleep(0.5)

@router.get("/stream/{trip_id}")
async def stream_agent_progress(trip_id: int):
    return EventSourceResponse(database_agent_stream(trip_id))
