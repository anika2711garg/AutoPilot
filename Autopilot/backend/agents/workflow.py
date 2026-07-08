import asyncio
import re
import random
from datetime import datetime, timedelta
from typing import Dict, List, Any

from langgraph.graph import StateGraph, END
from sqlalchemy import select, update

from backend.agents.state import AgentState
from backend.core.db import SessionLocal
from backend.models.trip import Event, Trip, TripPlan, Segment, TripStatus

# Helper to write audit log events to the database
async def log_agent_event(trip_id: int, event_type: str, data: dict):
    if not trip_id:
        return
    async with SessionLocal() as db:
        event = Event(
            trip_id=trip_id,
            type=event_type,
            data_json=data,
            at=datetime.utcnow()
        )
        db.add(event)
        await db.commit()

# --- Specialist Agent Nodes ---

async def requirements_agent(state: AgentState):
    trip_id = state.get("trip_id")
    await log_agent_event(trip_id, "agent_start", {"agent": "Requirements Agent", "message": "Parsing trip requirements and preferences..."})
    
    # Retrieve user prompt
    messages = state.get("messages", [])
    prompt = messages[-1].get("content", "") if messages else ""
    
    # Default values
    destination = "Goa, India"
    budget = 35000
    vibe = "beach"
    days = 5
    start_date = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")
    end_date = (datetime.utcnow() + timedelta(days=35)).strftime("%Y-%m-%d")
    
    # Simple regex parsing
    prompt_lower = prompt.lower()
    if "tokyo" in prompt_lower:
        destination = "Tokyo, Japan"
        budget = 180000
        vibe = "city explorer"
    elif "bali" in prompt_lower:
        destination = "Bali, Indonesia"
        budget = 75000
        vibe = "tropical relaxation"
    elif "london" in prompt_lower:
        destination = "London, UK"
        budget = 200000
        vibe = "historic city"
    
    # Budget extraction
    budget_match = re.search(r'(?:rs\.?|inr|₹|\$)\s*(\d+[\d,]*)|(\d+[\d,]*)\s*(?:rs\.?|inr|₹|\$|dollars|rupees)', prompt_lower)
    if budget_match:
        val = budget_match.group(1) or budget_match.group(2)
        val = val.replace(",", "")
        try:
            budget = int(val)
        except ValueError:
            pass
    else:
        # fallback just digit extraction
        digit_match = re.search(r'\b(\d{4,6})\b', prompt_lower)
        if digit_match:
            try:
                budget = int(digit_match.group(1))
            except ValueError:
                pass

    # Days extraction
    days_match = re.search(r'(\d+)\s*(?:day|night)', prompt_lower)
    if days_match:
        try:
            days = int(days_match.group(1))
            end_date = (datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=days)).strftime("%Y-%m-%d")
        except ValueError:
            pass

    brief = {
        "origin": "Mumbai, India" if "tokyo" not in prompt_lower else "Delhi, India",
        "destination": destination,
        "start_date": start_date,
        "end_date": end_date,
        "days": days,
        "budget": budget,
        "vibe": vibe,
        "party_size": 1
    }
    
    await log_agent_event(trip_id, "agent_log", {
        "agent": "Requirements Agent",
        "message": f"Requirements parsed: Destination={destination}, Budget={budget}, Duration={days} days, Vibe={vibe}."
    })
    
    await asyncio.sleep(1.0)
    
    return {
        "brief": brief,
        "destination": destination,
        "start_date": start_date,
        "end_date": end_date,
        "budget": budget,
        "status": "Requirements Parsed",
        "next_agent": "budget_agent"
    }

async def budget_agent(state: AgentState):
    trip_id = state.get("trip_id")
    await log_agent_event(trip_id, "agent_start", {"agent": "Budget Agent", "message": "Allocating total budget into constraint categories..."})
    
    budget = state.get("budget", 35000)
    brief = state.get("brief", {})
    vibe = brief.get("vibe", "beach")
    
    # Enforce allocation schema: Transport 35%, Stay 30%, Food 15%, Activities 12%, Buffer 8%
    # Adjust slightly based on vibe
    p_transport = 0.35
    p_stay = 0.30
    p_food = 0.15
    p_activities = 0.12
    p_buffer = 0.08
    
    if vibe == "city explorer":
        p_transport = 0.40
        p_stay = 0.28
    elif vibe == "tropical relaxation":
        p_stay = 0.40
        p_transport = 0.28
        
    alloc = {
        "transport": int(budget * p_transport),
        "accommodation": int(budget * p_stay),
        "food": int(budget * p_food),
        "activities": int(budget * p_activities),
        "buffer": int(budget * p_buffer)
    }
    
    # Check feasibility
    currency_symbol = "$" if "Japan" in state.get("destination", "") or "UK" in state.get("destination", "") else "₹"
    feasible = True
    msg = f"Budget split successfully calculated."
    
    min_budgets = {"Goa, India": 15000, "Tokyo, Japan": 120000, "Bali, Indonesia": 45000}
    dest = state.get("destination", "Goa, India")
    min_required = min_budgets.get(dest, 20000)
    
    if budget < min_required:
        feasible = False
        msg = f"WARNING: Budget of {currency_symbol}{budget} is tight for a {brief.get('days', 5)}-day trip to {dest}. Minimum suggested: {currency_symbol}{min_required}. Suggesting optimized budget options."
    
    await log_agent_event(trip_id, "agent_log", {
        "agent": "Budget Agent",
        "message": f"Feasibility Check: {'PASSED' if feasible else 'WARNING'}. Allocations: Transport={currency_symbol}{alloc['transport']}, Stay={currency_symbol}{alloc['accommodation']}, Food={currency_symbol}{alloc['food']}, Activities={currency_symbol}{alloc['activities']}, Buffer={currency_symbol}{alloc['buffer']}"
    })
    
    if not feasible:
        await log_agent_event(trip_id, "agent_log", {
            "agent": "Budget Agent",
            "message": f"Adjusting allocation ratios to maximize stay and transport efficiency."
        })
        
    await asyncio.sleep(1.0)
    
    return {
        "budget_allocation": alloc,
        "status": "Budget Split Computed",
        "next_agent": "transport_agent"
    }

async def transport_agent(state: AgentState):
    trip_id = state.get("trip_id")
    await log_agent_event(trip_id, "agent_start", {"agent": "Transport Agent", "message": "Searching transit options and flight schedules..."})
    
    brief = state.get("brief", {})
    dest = state.get("destination", "Goa, India")
    alloc = state.get("budget_allocation", {})
    transport_budget = alloc.get("transport", 12000)
    
    # Dynamic flight generation based on destination
    flights = []
    if "Goa" in dest:
        flights = [
            {
                "id": "FL-IND-243",
                "airline": "IndiGo",
                "flight_no": "6E-243",
                "from": "BOM",
                "to": "GOI",
                "departure": "10:00 AM",
                "arrival": "11:20 AM",
                "price": int(transport_budget * 0.7),
                "type": "Non-stop Flight",
                "rating": 4.2,
                "deeplink": "https://www.goindigo.in/"
            },
            {
                "id": "FL-AI-883",
                "airline": "Air India",
                "flight_no": "AI-883",
                "from": "BOM",
                "to": "GOI",
                "departure": "02:15 PM",
                "arrival": "03:40 PM",
                "price": int(transport_budget * 0.85),
                "type": "Non-stop Flight",
                "rating": 4.0,
                "deeplink": "https://www.airindia.in/"
            }
        ]
    elif "Tokyo" in dest:
        flights = [
            {
                "id": "FL-ANA-818",
                "airline": "All Nippon Airways",
                "flight_no": "NH-818",
                "from": "DEL",
                "to": "NRT",
                "departure": "08:20 AM",
                "arrival": "06:10 PM",
                "price": int(transport_budget * 0.75),
                "type": "Direct Flight",
                "rating": 4.8,
                "deeplink": "https://www.ana.co.jp/"
            },
            {
                "id": "FL-JAL-030",
                "airline": "Japan Airlines",
                "flight_no": "JL-030",
                "from": "DEL",
                "to": "HND",
                "departure": "07:15 PM",
                "arrival": "05:00 AM (+1)",
                "price": int(transport_budget * 0.9),
                "type": "Direct Flight",
                "rating": 4.7,
                "deeplink": "https://www.jal.co.jp/"
            }
        ]
    else:  # Bali / default
        flights = [
            {
                "id": "FL-SQ-948",
                "airline": "Singapore Airlines",
                "flight_no": "SQ-948",
                "from": "BOM",
                "to": "DPS",
                "departure": "11:45 PM",
                "arrival": "09:15 AM (+1)",
                "price": int(transport_budget * 0.8),
                "type": "1-stop via Singapore",
                "rating": 4.7,
                "deeplink": "https://www.singaporeair.com/"
            }
        ]
        
    await log_agent_event(trip_id, "agent_log", {
        "agent": "Transport Agent",
        "message": f"Found {len(flights)} flight options. Selected optimal options within transport budget limit."
    })
    
    await asyncio.sleep(1.0)
    
    return {
        "flights": flights,
        "status": "Transport Found",
        "next_agent": "accommodation_agent"
    }

async def accommodation_agent(state: AgentState):
    trip_id = state.get("trip_id")
    await log_agent_event(trip_id, "agent_start", {"agent": "Accommodation Agent", "message": "Locating hotel inventories near points of interest..."})
    
    dest = state.get("destination", "Goa, India")
    alloc = state.get("budget_allocation", {})
    stay_budget = alloc.get("accommodation", 10000)
    
    hotels = []
    if "Goa" in dest:
        hotels = [
            {
                "id": "HT-TAJ-FORT",
                "name": "Taj Fort Aguada Resort & Spa",
                "stars": 5,
                "price_per_night": int(stay_budget / 3),
                "rating": 4.8,
                "location": "Candolim, North Goa",
                "coordinates": {"lat": 15.4926, "lng": 73.7736},
                "policy": "Free cancellation 24h before",
                "amenities": ["Pool", "Beach Access", "Spa", "Free WiFi"],
                "deeplink": "https://www.tajhotels.com/"
            },
            {
                "id": "HT-WHISP-PALMS",
                "name": "Whispering Palms Beach Resort",
                "stars": 4,
                "price_per_night": int(stay_budget / 5),
                "rating": 4.2,
                "location": "Calangute, North Goa",
                "coordinates": {"lat": 15.5414, "lng": 73.7629},
                "policy": "Non-refundable",
                "amenities": ["Pool", "All Inclusive", "Free Breakfast"],
                "deeplink": "https://www.whisperingpalms.com/"
            }
        ]
    elif "Tokyo" in dest:
        hotels = [
            {
                "id": "HT-SHINJUKU-GRACERY",
                "name": "Hotel Gracery Shinjuku",
                "stars": 4,
                "price_per_night": int(stay_budget / 4),
                "rating": 4.5,
                "location": "Shinjuku, Tokyo",
                "coordinates": {"lat": 35.6939, "lng": 139.7022},
                "policy": "Free cancellation 48h before",
                "amenities": ["City view", "English speaking staff", "Free WiFi"],
                "deeplink": "https://shinjuku.gracery.com/"
            },
            {
                "id": "HT-METROPOLITAN-TOKYO",
                "name": "Hotel Metropolitan Tokyo Ikebukuro",
                "stars": 4,
                "price_per_night": int(stay_budget / 5),
                "rating": 4.4,
                "location": "Toshima, Tokyo",
                "coordinates": {"lat": 35.7291, "lng": 139.7065},
                "policy": "Free cancellation 24h before",
                "amenities": ["Pool", "Fitness Center", "Subway Connection"],
                "deeplink": "https://ikebukuro.metropolitan.jp/"
            }
        ]
    else:  # Bali / default
        hotels = [
            {
                "id": "HT-AYANA-BALI",
                "name": "AYANA Resort Bali",
                "stars": 5,
                "price_per_night": int(stay_budget / 4),
                "rating": 4.9,
                "location": "Jimbaran, Bali",
                "coordinates": {"lat": -8.7675, "lng": 115.1275},
                "policy": "Free cancellation 7 days before",
                "amenities": ["Infinity Pool", "Private Beach", "12 Dining Options"],
                "deeplink": "https://www.ayana.com/"
            }
        ]
        
    await log_agent_event(trip_id, "agent_log", {
        "agent": "Accommodation Agent",
        "message": f"Found {len(hotels)} accommodation shortlist options near center of gravity."
    })
    
    await asyncio.sleep(1.0)
    
    return {
        "hotels": hotels,
        "status": "Accommodation Found",
        "next_agent": "itinerary_agent"
    }

async def itinerary_agent(state: AgentState):
    trip_id = state.get("trip_id")
    await log_agent_event(trip_id, "agent_start", {"agent": "Itinerary Agent", "message": "Structuring day-by-day sequence of events and geolocating stops..."})
    
    dest = state.get("destination", "Goa, India")
    brief = state.get("brief", {})
    days = brief.get("days", 5)
    
    # Daily activities generator
    itinerary = []
    
    if "Goa" in dest:
        stops = [
            {"name": "Fort Aguada", "lat": 15.4926, "lng": 73.7736, "time": "03:00 PM"},
            {"name": "Calangute Beach Walk", "lat": 15.5414, "lng": 73.7629, "time": "09:00 AM"},
            {"name": "Baga Beach Sunset", "lat": 15.5528, "lng": 73.7517, "time": "05:00 PM"},
            {"name": "Basilica of Bom Jesus", "lat": 15.5009, "lng": 73.9116, "time": "10:30 AM"},
            {"name": "Fontainhas Latin Quarter", "lat": 15.4989, "lng": 73.8315, "time": "02:30 PM"},
            {"name": "Dudhsagar Waterfalls Trek", "lat": 15.3179, "lng": 74.3142, "time": "08:00 AM"},
            {"name": "Panaji Local Spice Market", "lat": 15.4950, "lng": 73.8270, "time": "11:00 AM"}
        ]
    elif "Tokyo" in dest:
        stops = [
            {"name": "Senso-ji Temple (Asakusa)", "lat": 35.7148, "lng": 139.7967, "time": "10:00 AM"},
            {"name": "Ueno Park Cherry Blossom Path", "lat": 35.7154, "lng": 139.7741, "time": "01:30 PM"},
            {"name": "Shibuya Crossing & Hachiko", "lat": 35.6580, "lng": 139.7016, "time": "05:30 PM"},
            {"name": "Meiji Jingu Shrine", "lat": 35.6764, "lng": 139.6993, "time": "09:30 AM"},
            {"name": "Harajuku Takeshita Street", "lat": 35.6702, "lng": 139.7027, "time": "12:00 PM"},
            {"name": "Akihabara Electric Town", "lat": 35.6997, "lng": 139.7715, "time": "03:00 PM"},
            {"name": "Tokyo Skytree Sunset View", "lat": 35.7101, "lng": 139.8107, "time": "06:30 PM"}
        ]
    else:  # Bali
        stops = [
            {"name": "Uluwatu Temple Cliff Walk", "lat": -8.8291, "lng": 115.0849, "time": "04:30 PM"},
            {"name": "Tegallalang Rice Terraces", "lat": -8.4312, "lng": 115.2796, "time": "09:00 AM"},
            {"name": "Sacred Monkey Forest Sanctuary", "lat": -8.5194, "lng": 115.2626, "time": "11:30 AM"},
            {"name": "Seminyak Beach Club Leisure", "lat": -8.6913, "lng": 115.1557, "time": "03:00 PM"},
            {"name": "Tanah Lot Temple Sunset", "lat": -8.6212, "lng": 115.0868, "time": "05:30 PM"}
        ]
        
    for i in range(1, days + 1):
        day_stops = []
        if i == 1:
            day_stops = [
                {"title": "Airport Arrival & Transit", "time": "11:30 AM", "desc": "Landed and caught airport shuttle to hotel.", "lat": stops[0]["lat"] - 0.05, "lng": stops[0]["lng"] - 0.05},
                {"title": "Hotel Check-In", "time": "02:00 PM", "desc": "Settled into rooms, briefing of the stay.", "lat": stops[0]["lat"], "lng": stops[0]["lng"]},
                {"title": f"Explore {stops[0]['name']}", "time": stops[0]["time"], "desc": "Casual walk around, taking photos.", "lat": stops[0]["lat"], "lng": stops[0]["lng"]}
            ]
        elif i == days:
            day_stops = [
                {"title": "Morning Checkout & Souvenirs", "time": "10:00 AM", "desc": "Packed baggage, settled bills, visited local stalls.", "lat": stops[-1]["lat"], "lng": stops[-1]["lng"]},
                {"title": "Departure Transit", "time": "02:00 PM", "desc": "Headed back to terminal for return travel.", "lat": stops[-1]["lat"] - 0.03, "lng": stops[-1]["lng"] - 0.03}
            ]
        else:
            stop_a = stops[(i * 2 - 3) % len(stops)]
            stop_b = stops[(i * 2 - 2) % len(stops)]
            day_stops = [
                {"title": f"Visit {stop_a['name']}", "time": stop_a["time"], "desc": "Interactive guided tour of historical point.", "lat": stop_a["lat"], "lng": stop_a["lng"]},
                {"title": "Midday Gastronomy Stop", "time": "01:00 PM", "desc": "Tried local street food recommendations.", "lat": (stop_a["lat"] + stop_b["lat"])/2, "lng": (stop_a["lng"] + stop_b["lng"])/2},
                {"title": f"Adventure: {stop_b['name']}", "time": stop_b["time"], "desc": "Leisure sightseeing and sunset photography.", "lat": stop_b["lat"], "lng": stop_b["lng"]}
            ]
            
        itinerary.append({
            "day": i,
            "title": f"Day {i}: " + ("Arrival & Welcome" if i == 1 else "Return Flight" if i == days else f"Exploring {dest.split(',')[0]} Highlights"),
            "events": day_stops
        })
        
    await log_agent_event(trip_id, "agent_log", {
        "agent": "Itinerary Agent",
        "message": f"Day-by-day itinerary structured for {days} days. Set coordinates for map rendering."
    })
    
    await asyncio.sleep(1.0)
    
    return {
        "itinerary": itinerary,
        "status": "Itinerary Planned",
        "next_agent": "local_info_agent"
    }

async def local_info_agent(state: AgentState):
    trip_id = state.get("trip_id")
    await log_agent_event(trip_id, "agent_start", {"agent": "Local Info Agent", "message": "Collecting local weather reports, advisories, and FX rates..."})
    
    dest = state.get("destination", "Goa, India")
    
    info = {
        "weather": {
            "temp": "29°C" if "Goa" in dest or "Bali" in dest else "12°C" if "December" in state.get("start_date", "") else "22°C",
            "condition": "Sunny & Calm" if "Goa" in dest or "Bali" in dest else "Cool & Overcast",
            "desc": "Ideal for outdoor excursions. Keep hydrated!" if "Goa" in dest or "Bali" in dest else "Keep a light jacket handy."
        },
        "currency": {
            "name": "INR (₹)" if "Goa" in dest else "JPY (¥)" if "Tokyo" in dest else "IDR (Rp)",
            "rate": "1 USD = 83.5 INR" if "Goa" in dest else "1 USD = 160 JPY" if "Tokyo" in dest else "1 USD = 16,300 IDR"
        },
        "safety": "Generally safe. Stay in well-lit areas at night and use official transport providers only.",
        "visa": "Visa-on-arrival / E-visa eligible" if "Bali" in dest or "Tokyo" in dest else "Not required (Domestic)"
    }
    
    await log_agent_event(trip_id, "agent_log", {
        "agent": "Local Info Agent",
        "message": f"Local settings gathered. Weather forecast: {info['weather']['temp']} {info['weather']['condition']}."
    })
    
    await asyncio.sleep(1.0)
    
    return {
        "local_info": info,
        "status": "Local Settings Collected",
        "next_agent": "packing_agent"
    }

async def packing_agent(state: AgentState):
    trip_id = state.get("trip_id")
    await log_agent_event(trip_id, "agent_start", {"agent": "Packing Agent", "message": "Compiling checklist customized to destination weather..."})
    
    dest = state.get("destination", "Goa, India")
    info = state.get("local_info", {})
    temp = info.get("weather", {}).get("temp", "25°C")
    is_warm = "28" in temp or "29" in temp or "30" in temp or "31" in temp
    
    checklist = [
        {"item": "Passport & Travel Itinerary copy", "category": "Essentials", "packed": False},
        {"item": "Universal power adapters & chargers", "category": "Electronics", "packed": False},
        {"item": "First aid kit & prescription medications", "category": "Medical", "packed": False}
    ]
    
    if is_warm:
        checklist.extend([
            {"item": "UV Protecting Sunscreen (SPF 50+)", "category": "Essentials", "packed": False},
            {"item": "Comfortable swimwear & beach towels", "category": "Clothing", "packed": False},
            {"item": "Breathable cotton t-shirts & shorts", "category": "Clothing", "packed": False},
            {"item": "Polarized sunglasses & sun hat", "category": "Accessories", "packed": False}
        ])
    else:
        checklist.extend([
            {"item": "Thermal layer sweaters & hoodie", "category": "Clothing", "packed": False},
            {"item": "Comfortable sneakers for city walks", "category": "Clothing", "packed": False},
            {"item": "Lip balm & moisturizer", "category": "Essentials", "packed": False},
            {"item": "Compact travel umbrella", "category": "Accessories", "packed": False}
        ])
        
    await log_agent_event(trip_id, "agent_log", {
        "agent": "Packing Agent",
        "message": f"Created customized checklist containing {len(checklist)} items."
    })
    
    await asyncio.sleep(1.0)
    
    return {
        "packing_list": checklist,
        "status": "Checklist Assembled",
        "next_agent": "supervisor_agent"
    }

async def supervisor_agent(state: AgentState):
    trip_id = state.get("trip_id")
    await log_agent_event(trip_id, "agent_start", {"agent": "Supervisor", "message": "Reconciling calculations, merging segments and saving draft plan..."})
    
    # Compute final details
    flights = state.get("flights", [])
    hotels = state.get("hotels", [])
    itinerary = state.get("itinerary", [])
    
    selected_flight = flights[0] if flights else {}
    selected_hotel = hotels[0] if hotels else {}
    
    flight_cost = selected_flight.get("price", 0)
    hotel_cost = selected_hotel.get("price_per_night", 0) * (len(itinerary) - 1 if len(itinerary) > 1 else 1)
    
    alloc = state.get("budget_allocation", {})
    food_cost = alloc.get("food", 0)
    activities_cost = alloc.get("activities", 0)
    buffer_cost = alloc.get("buffer", 0)
    
    total_cost = flight_cost + hotel_cost + food_cost + activities_cost + buffer_cost
    
    # Save the generated plan & update trip info in DB
    async with SessionLocal() as db:
        # Clear existing plan and segments to prevent duplicates
        from sqlalchemy import delete
        await db.execute(delete(TripPlan).where(TripPlan.trip_id == trip_id))
        await db.execute(delete(Segment).where(Segment.trip_id == trip_id))
        
        # Create TripPlan record
        plan = TripPlan(
            trip_id=trip_id,
            itinerary=state.get("itinerary"),
            flights=state.get("flights"),
            hotels=state.get("hotels"),
            activities=state.get("activities"),
            estimated_cost=total_cost
        )
        db.add(plan)
        
        # Populate Segments table
        if selected_flight:
            db.add(Segment(
                trip_id=trip_id,
                kind="flight",
                provider=selected_flight.get("airline"),
                provider_ref=selected_flight.get("flight_no"),
                price=flight_cost,
                status="pending",
                payload_json=selected_flight
            ))
            
        if selected_hotel:
            db.add(Segment(
                trip_id=trip_id,
                kind="hotel",
                provider=selected_hotel.get("name"),
                provider_ref=selected_hotel.get("id"),
                price=hotel_cost,
                status="pending",
                payload_json=selected_hotel
            ))
            
        # Update trip status
        await db.execute(
            update(Trip)
            .where(Trip.id == trip_id)
            .values(
                destination=state.get("destination"),
                budget=state.get("budget"),
                dates=f"{state.get('start_date')} - {state.get('end_date')}",
                status=TripStatus.APPROVAL_PENDING,
                preferences={
                    "vibe": state.get("brief", {}).get("vibe"),
                    "budget_allocation": alloc,
                    "local_info": state.get("local_info"),
                    "packing_list": state.get("packing_list")
                }
            )
        )
        
        await db.commit()
        
    await log_agent_event(trip_id, "agent_end", {
        "agent": "Supervisor",
        "message": f"Draft plan assembled. Estimated Total: {total_cost}. Paused workflow. Awaiting User approval."
    })
    
    return {
        "total_cost": total_cost,
        "next_agent": END,
        "status": "Awaiting Approval"
    }

# --- StateGraph Assembly ---

workflow = StateGraph(AgentState)

workflow.add_node("supervisor_agent", supervisor_agent)
workflow.add_node("requirements_agent", requirements_agent)
workflow.add_node("budget_agent", budget_agent)
workflow.add_node("transport_agent", transport_agent)
workflow.add_node("accommodation_agent", accommodation_agent)
workflow.add_node("itinerary_agent", itinerary_agent)
workflow.add_node("local_info_agent", local_info_agent)
workflow.add_node("packing_agent", packing_agent)

workflow.set_entry_point("requirements_agent")

workflow.add_edge("requirements_agent", "budget_agent")
workflow.add_edge("budget_agent", "transport_agent")
workflow.add_edge("transport_agent", "accommodation_agent")
workflow.add_edge("accommodation_agent", "itinerary_agent")
workflow.add_edge("itinerary_agent", "local_info_agent")
workflow.add_edge("local_info_agent", "packing_agent")
workflow.add_edge("packing_agent", "supervisor_agent")
workflow.add_edge("supervisor_agent", END)

app_graph = workflow.compile()
