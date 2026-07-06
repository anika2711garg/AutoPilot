from typing import TypedDict, Annotated, List, Optional, Any
import operator

class AgentState(TypedDict):
    """
    The state of the multi-agent travel planning system.
    """
    messages: Annotated[List[dict], operator.add]
    user_id: int
    trip_id: Optional[int]
    
    # Requirements
    destination: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    budget: Optional[int]
    preferences: Optional[dict]
    
    # Plans
    flights: Optional[List[dict]]
    hotels: Optional[List[dict]]
    activities: Optional[List[dict]]
    
    # Final Output
    itinerary: Optional[List[dict]]
    total_cost: Optional[int]
    
    # Current active agent or status
    next_agent: str
    status: str
