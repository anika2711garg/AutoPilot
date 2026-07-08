import uuid
import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, desc

from backend.core.db import get_db, SessionLocal
from backend.models.trip import Trip, TripPlan, Segment, Order, Event, TripStatus
from backend.agents.workflow import app_graph, log_agent_event

router = APIRouter()

# --- Pydantic Schemas ---

class TripCreateRequest(BaseModel):
    prompt: str = Field(..., min_length=1)

class ReoptimizeRequest(BaseModel):
    budget: int
    allocations: Dict[str, int]

class BookingRequest(BaseModel):
    simulation_mode: str = "success"  # success | hotel_sold_out | price_spike

# --- Background Task Runner ---

async def run_agent_workflow(trip_id: int, prompt: str):
    try:
        # Run LangGraph graph in background
        initial_state = {
            "messages": [{"role": "user", "content": prompt}],
            "trip_id": trip_id,
            "user_id": 1,
            "next_agent": "requirements_agent",
            "status": "started",
            "brief": {},
            "budget_allocation": {},
            "flights": [],
            "hotels": [],
            "activities": [],
            "itinerary": [],
            "packing_list": [],
            "local_info": {},
            "selected": {},
            "approvals": {"budget_ok": False, "booking_ok": False},
            "errors": []
        }
        await app_graph.ainvoke(initial_state)
    except Exception as e:
        print(f"Error executing agent workflow: {e}")
        await log_agent_event(trip_id, "agent_error", {
            "agent": "Supervisor",
            "message": f"Critical error executing planning pipeline: {str(e)}"
        })
        # Reset status
        async with SessionLocal() as db:
            await db.execute(
                update(Trip).where(Trip.id == trip_id).values(status=TripStatus.PLANNING)
            )
            await db.commit()

# --- API Endpoints ---

@router.get("/")
async def get_trips(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Trip).order_by(desc(Trip.id))
    )
    trips = result.scalars().all()
    
    trip_list = []
    for trip in trips:
        # Get plan estimated cost
        plan_res = await db.execute(select(TripPlan).where(TripPlan.trip_id == trip.id))
        plan = plan_res.scalars().first()
        estimated_cost = plan.estimated_cost if plan else 0
        budget_str = f"₹{trip.budget:,}" if trip.currency == "INR" else f"${trip.budget:,}"
        
        trip_list.append({
            "id": trip.id,
            "title": f"Trip to {trip.destination or 'Custom Destination'}",
            "destination": trip.destination or "Custom",
            "dates": trip.dates or "Dates pending",
            "budget": budget_str,
            "status": trip.status.value.capitalize(),
            "summary": f"Plan for {trip.destination} with a budget of {budget_str}."
        })
        
    return trip_list

@router.get("/summary")
async def get_trip_summary(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Trip))
    trips = result.scalars().all()
    
    return {
        "active_trips": len(trips),
        "planning_ready": True,
        "favorite_destinations": ["Goa, India", "Tokyo, Japan", "Bali, Indonesia"],
        "quick_tips": [
            "Include dates and budget for sharper recommendations.",
            "Mention trip style like beach, city, or adventure.",
            "Adjust budget sliders dynamically to trigger agent re-planning."
        ]
    }

@router.get("/{trip_id}")
async def get_trip(trip_id: int, db: AsyncSession = Depends(get_db)):
    # Fetch Trip
    trip_res = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = trip_res.scalars().first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # Fetch Trip Plan
    plan_res = await db.execute(select(TripPlan).where(TripPlan.trip_id == trip_id))
    plan = plan_res.scalars().first()
    
    # Fetch Segments
    seg_res = await db.execute(select(Segment).where(Segment.trip_id == trip_id))
    segments = seg_res.scalars().all()
    
    # Fetch Orders
    ord_res = await db.execute(select(Order).where(Order.trip_id == trip_id))
    orders = ord_res.scalars().all()
    
    # Fetch Audit Logs / Events
    evt_res = await db.execute(select(Event).where(Event.trip_id == trip_id).order_by(Event.at.asc()))
    events = evt_res.scalars().all()
    
    budget_str = f"₹{trip.budget:,}" if trip.currency == "INR" else f"${trip.budget:,}"
    estimated_cost = plan.estimated_cost if plan else 0
    estimated_cost_str = f"₹{estimated_cost:,}" if trip.currency == "INR" else f"${estimated_cost:,}"
    
    # Formulate payload
    return {
        "id": trip.id,
        "title": f"Trip to {trip.destination}",
        "destination": trip.destination,
        "dates": trip.dates or "Dates pending",
        "budget": budget_str,
        "budget_val": trip.budget,
        "estimated_cost": estimated_cost_str,
        "estimated_cost_val": estimated_cost,
        "status": trip.status.value.capitalize(),
        "summary": f"Autopilot compiled a {trip.preferences.get('vibe', 'custom')} trip fitting your preferences.",
        "preferences": trip.preferences or {},
        "plan": {
            "itinerary": plan.itinerary if plan else None,
            "flights": plan.flights if plan else [],
            "hotels": plan.hotels if plan else [],
            "activities": plan.activities if plan else [],
            "estimated_cost": estimated_cost
        } if plan else None,
        "segments": [{
            "id": s.id,
            "kind": s.kind,
            "provider": s.provider,
            "provider_ref": s.provider_ref,
            "price": s.price,
            "status": s.status,
            "payload": s.payload_json
        } for s in segments],
        "orders": [{
            "id": o.id,
            "status": o.status,
            "provider": o.provider,
            "amount": o.amount,
            "created_at": o.created_at.isoformat()
        } for o in orders],
        "events": [{
            "id": e.id,
            "type": e.type,
            "data": e.data_json,
            "at": e.at.isoformat()
        } for e in events]
    }

@router.post("/")
async def create_trip(request: TripCreateRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    prompt = request.prompt.strip()
    
    # Create the Trip row
    trip = Trip(
        user_id=1,
        destination="Processing...",
        dates="Processing...",
        budget=0,
        status=TripStatus.PLANNING,
        preferences={"vibe": "beach"}
    )
    db.add(trip)
    await db.commit()
    await db.refresh(trip)
    
    # Write initial audit log
    db.add(Event(
        trip_id=trip.id,
        type="agent_log",
        data_json={"agent": "Supervisor", "message": f"Initialized planning workflow for: '{prompt}'"}
    ))
    await db.commit()
    
    # Kick off LangGraph background task
    background_tasks.add_task(run_agent_workflow, trip.id, prompt)
    
    budget_str = "Budget pending"
    
    return {
        "assistant_message": f"I received your request and initialized the specialist agent team for Trip #{trip.id}. Watch their live progress in the activity tracker.",
        "trip": {
            "id": trip.id,
            "title": f"Trip #{trip.id} Planning",
            "destination": "Planning in progress...",
            "dates": "Dates pending",
            "budget": budget_str,
            "status": "Planning",
            "summary": f"Autopilot is analyzing: '{prompt}'"
        },
        "next_steps": ["Open the trip card to watch the planning nodes execute in real time."],
        "recommendations": ["You can adjust the budget ratios once the draft plan compiles."]
    }

@router.post("/{trip_id}/reoptimize")
async def reoptimize_trip(trip_id: int, request: ReoptimizeRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    trip_res = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = trip_res.scalars().first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # Update trip status and details
    trip.status = TripStatus.PLANNING
    trip.budget = request.budget
    
    # Clear previous segments and plans
    await db.execute(delete(TripPlan).where(TripPlan.trip_id == trip_id))
    await db.execute(delete(Segment).where(Segment.trip_id == trip_id))
    
    # Write event
    db.add(Event(
        trip_id=trip_id,
        type="agent_log",
        data_json={"agent": "Supervisor", "message": f"Re-planning triggered. New budget: {request.budget}. Allocations: {request.allocations}"}
    ))
    await db.commit()
    
    # Re-run workflow with static prompt
    prompt = f"Trip to {trip.destination} with a budget of {request.budget}"
    
    # Start graph execution in background
    background_tasks.add_task(run_agent_workflow, trip_id, prompt)
    
    return {"message": "Re-optimization successfully scheduled."}

@router.post("/{trip_id}/price-check")
async def price_check_trip(trip_id: int, db: AsyncSession = Depends(get_db)):
    # SimulatesStop 09 live price check
    trip_res = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = trip_res.scalars().first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    plan_res = await db.execute(select(TripPlan).where(TripPlan.trip_id == trip_id))
    plan = plan_res.scalars().first()
    estimated_cost = plan.estimated_cost if plan else 0
    
    # Simulate a tiny price drift
    price_changed = random.choice([True, False])
    delta = 0
    if price_changed:
        delta = int(estimated_cost * random.choice([0.02, 0.05, -0.01])) # 2%, 5% or -1%
        
    db.add(Event(
        trip_id=trip_id,
        type="agent_log",
        data_json={
            "agent": "Supervisor",
            "message": f"Price validation check: Estimated cost={estimated_cost}. Price Drift Delta={delta:+}. Confirming booking availability..."
        }
    ))
    await db.commit()
    
    return {
        "price_drift": price_changed,
        "delta": delta,
        "new_total": estimated_cost + delta
    }

@router.post("/{trip_id}/approve")
async def approve_trip(trip_id: int, db: AsyncSession = Depends(get_db)):
    trip_res = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = trip_res.scalars().first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    trip.status = TripStatus.APPROVAL_PENDING
    db.add(Event(
        trip_id=trip_id,
        type="agent_log",
        data_json={"agent": "Supervisor", "message": "Plan approved by traveler. Pending final payment checkout."}
    ))
    await db.commit()
    return {"status": "approval_pending"}

@router.post("/{trip_id}/book")
async def book_trip(trip_id: int, request: BookingRequest, db: AsyncSession = Depends(get_db)):
    trip_res = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = trip_res.scalars().first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    seg_res = await db.execute(select(Segment).where(Segment.trip_id == trip_id))
    segments = seg_res.scalars().all()
    
    # 1. Generate Idempotency Key
    idempotency_key = str(uuid.uuid4())
    
    db.add(Event(
        trip_id=trip_id,
        type="saga_start",
        data_json={"agent": "Booking Executor", "message": "Initiating Saga booking transaction...", "idempotency_key": idempotency_key}
    ))
    await db.commit()
    
    success = True
    flight_segment = next((s for s in segments if s.kind == "flight"), None)
    hotel_segment = next((s for s in segments if s.kind == "hotel"), None)
    
    orders_created = []
    
    # 2. Book Flight
    if flight_segment:
        db.add(Event(
            trip_id=trip_id,
            type="saga_log",
            data_json={"agent": "Booking Executor", "message": f"Reserving segment: Flight {flight_segment.provider_ref} ({flight_segment.provider})"}
        ))
        # Create flight order
        flight_order = Order(
            trip_id=trip_id,
            idempotency_key=f"ord_fl_{flight_segment.id}_{idempotency_key[:8]}",
            provider=flight_segment.provider,
            status="confirmed",
            amount=flight_segment.price,
            provider_order_id=f"RES-{flight_segment.provider_ref}"
        )
        db.add(flight_order)
        flight_segment.status = "confirmed"
        orders_created.append(flight_order)
        await db.commit()
        await asyncio.sleep(1.0)
        
    # 3. Book Hotel
    if hotel_segment:
        db.add(Event(
            trip_id=trip_id,
            type="saga_log",
            data_json={"agent": "Booking Executor", "message": f"Reserving segment: Hotel {hotel_segment.provider} (ID: {hotel_segment.provider_ref})"}
        ))
        await db.commit()
        await asyncio.sleep(1.2)
        
        if request.simulation_mode == "hotel_sold_out":
            success = False
            # Log the GDS/hotelbeds failure
            db.add(Event(
                trip_id=trip_id,
                type="saga_log",
                data_json={"agent": "Booking Executor", "message": f"ERROR: Hotel booking failed. Provider reported code 410: SOLD OUT.", "error": "Hotel Inventory Unavailable"}
            ))
            # Mark segment failed
            hotel_segment.status = "failed"
            await db.commit()
        else:
            # Create hotel order
            hotel_order = Order(
                trip_id=trip_id,
                idempotency_key=f"ord_ht_{hotel_segment.id}_{idempotency_key[:8]}",
                provider=hotel_segment.provider,
                status="confirmed",
                amount=hotel_segment.price,
                provider_order_id=f"RES-{hotel_segment.provider_ref}"
            )
            db.add(hotel_order)
            hotel_segment.status = "confirmed"
            orders_created.append(hotel_order)
            await db.commit()
            
    # 4. Handle SAGA Outcome
    if success:
        trip.status = TripStatus.BOOKED
        db.add(Event(
            trip_id=trip_id,
            type="saga_end",
            data_json={"agent": "Booking Executor", "message": "Saga transaction successfully completed. Trip is officially Booked!"}
        ))
        await db.commit()
        return {"status": "success", "message": "Trip booked successfully!"}
    else:
        # SAGA ROLLBACK & COMPENSATIONS
        db.add(Event(
            trip_id=trip_id,
            type="saga_rollback",
            data_json={"agent": "Booking Executor", "message": "CRITICAL: Booking Saga interrupted. Executing compensating rollbacks..."}
        ))
        await db.commit()
        
        # Cancel any confirmed legs
        for ord_item in orders_created:
            db.add(Event(
                trip_id=trip_id,
                type="saga_rollback",
                data_json={"agent": "Booking Executor", "message": f"Compensating: Voiding/Refunding order {ord_item.provider_order_id} with {ord_item.provider}."}
            ))
            ord_item.status = "refunded"
            # Update corresponding segment
            for seg in segments:
                if seg.provider == ord_item.provider:
                    seg.status = "cancelled"
            await db.commit()
            await asyncio.sleep(0.8)
            
        trip.status = TripStatus.PLANNING # revert status to planning
        db.add(Event(
            trip_id=trip_id,
            type="saga_rollback_completed",
            data_json={"agent": "Booking Executor", "message": "Rollback compensation completed. Re-confirming state; ready to re-optimize."}
        ))
        await db.commit()
        
        return {
            "status": "failed",
            "message": "Hotel room became sold out. Flight reservation was automatically rolled back & refunded."
        }

@router.post("/{trip_id}/cancel")
async def cancel_trip(trip_id: int, db: AsyncSession = Depends(get_db)):
    trip_res = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = trip_res.scalars().first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    trip.status = TripStatus.CANCELLED
    
    # Refund orders
    ord_res = await db.execute(select(Order).where(Order.trip_id == trip_id))
    orders = ord_res.scalars().all()
    for ord_item in orders:
        ord_item.status = "refunded"
        
    db.add(Event(
        trip_id=trip_id,
        type="agent_log",
        data_json={"agent": "Supervisor", "message": "Trip cancelled. All transactions voided and refunded."}
    ))
    await db.commit()
    return {"status": "cancelled"}
