from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_trips():
    return [{"message": "List of trips"}]

@router.post("/")
async def create_trip():
    return {"message": "Create a trip"}
