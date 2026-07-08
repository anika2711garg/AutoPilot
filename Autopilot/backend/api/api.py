from fastapi import APIRouter
from backend.core.config import settings
from backend.api.endpoints import users, trips, agents

api_router = APIRouter()

api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(trips.router, prefix="/trips", tags=["trips"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])

@api_router.get("/")
async def api_root():
	return {
		"service": settings.PROJECT_NAME,
		"version": "1.0.0",
		"docs": "/docs",
		"endpoints": {
			"users": "/api/v1/users",
			"trips": "/api/v1/trips",
			"agents": "/api/v1/agents",
			"status": "/api/v1/status",
		},
	}

@api_router.get("/status")
async def api_status():
	return {
		"service": settings.PROJECT_NAME,
		"status": "healthy",
		"version": "1.0.0",
		"environment": "development",
	}
