from typing import TypedDict, Annotated, List, Optional, Any
import operator

class AgentState(TypedDict):
    """
    The state of the multi-agent travel planning system.
    """
    messages: Annotated[List[dict], operator.add]
    user_id: int
    trip_id: Optional[int]
    
    # Structured Brief & Settings
    brief: Optional[dict] # { "origin": str, "destination": str, "start_date": str, "end_date": str, "party_size": int, "vibe": str }
    budget_allocation: Optional[dict] # { "transport": int, "accommodation": int, "food": int, "activities": int, "buffer": int }
    
    # Requirements
    destination: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    budget: Optional[int]
    preferences: Optional[dict]
    
    # Plans Options & Shortlists
    flights: Optional[List[dict]]
    hotels: Optional[List[dict]]
    activities: Optional[List[dict]]
    local_info: Optional[dict] # Weather, currency, safety notes, visa
    packing_list: Optional[List[dict]] # Custom packing list items
    
    # User approvals & selections
    selected: Optional[dict] # User selected options
    approvals: Optional[dict] # { "budget_ok": bool, "booking_ok": bool }
    errors: Optional[List[dict]]
    
    # Final Output
    itinerary: Optional[List[dict]]
    total_cost: Optional[int]
    
    # Current active agent status
    next_agent: str
    status: str
