from langgraph.graph import StateGraph, END
from app.agents.state import AgentState

# Define agent nodes (Placeholder implementations)
def requirements_agent(state: AgentState):
    # Parse requirements from user input
    return {"status": "Parsed requirements", "next_agent": "budget_agent"}

def budget_agent(state: AgentState):
    # Allocate budget based on requirements
    return {"status": "Budget allocated", "next_agent": "transport_agent"}

def transport_agent(state: AgentState):
    # Search flights/trains
    return {"status": "Found transport", "next_agent": "accommodation_agent"}

def accommodation_agent(state: AgentState):
    # Search hotels
    return {"status": "Found accommodation", "next_agent": "itinerary_agent"}

def itinerary_agent(state: AgentState):
    # Generate day-by-day plan
    return {"status": "Itinerary created", "next_agent": "supervisor_agent"}

def supervisor_agent(state: AgentState):
    # Determine next steps or finish
    next_step = state.get("next_agent")
    if next_step == "supervisor_agent" or next_step is None:
        return {"next_agent": END}
    return {"next_agent": next_step}

# Build graph
workflow = StateGraph(AgentState)

workflow.add_node("supervisor_agent", supervisor_agent)
workflow.add_node("requirements_agent", requirements_agent)
workflow.add_node("budget_agent", budget_agent)
workflow.add_node("transport_agent", transport_agent)
workflow.add_node("accommodation_agent", accommodation_agent)
workflow.add_node("itinerary_agent", itinerary_agent)

workflow.set_entry_point("requirements_agent")

workflow.add_edge("requirements_agent", "budget_agent")
workflow.add_edge("budget_agent", "transport_agent")
workflow.add_edge("transport_agent", "accommodation_agent")
workflow.add_edge("accommodation_agent", "itinerary_agent")
workflow.add_edge("itinerary_agent", "supervisor_agent")
workflow.add_edge("supervisor_agent", END)

app_graph = workflow.compile()
