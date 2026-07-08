import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from backend.core.config import settings
from backend.models.base import Base

# Fall back to sqlite+aiosqlite if postgres connection details are default or if postgres is not running
database_url = os.getenv("DATABASE_URL")
if not database_url:
    # Check if we should use Postgres or fallback to SQLite
    # Since Docker was not detected, we default to SQLite for robust local execution.
    database_url = "sqlite+aiosqlite:///./autopilot.db"

SQLALCHEMY_DATABASE_URL = database_url

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,
    future=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db():
    async with SessionLocal() as session:
        yield session

async def init_db():
    # Import models here to ensure they are registered on the Base metadata
    from backend.models.user import User
    from backend.models.trip import Trip, TripPlan, Segment, Order, Event
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
