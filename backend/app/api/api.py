from fastapi import APIRouter
from app.api.endpoints import users, trips, agents

api_router = APIRouter()

api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(trips.router, prefix="/trips", tags=["trips"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
