from sqlalchemy import Column, String, Integer, ForeignKey, JSON, Enum, DateTime
from sqlalchemy.orm import relationship
import enum
from app.models.base import Base

class TripStatus(str, enum.Enum):
    PLANNING = "planning"
    APPROVAL_PENDING = "approval_pending"
    BOOKED = "booked"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    destination = Column(String, nullable=False)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    budget = Column(Integer, nullable=True)
    currency = Column(String, default="INR")
    status = Column(Enum(TripStatus), default=TripStatus.PLANNING)
    
    preferences = Column(JSON, nullable=True) # E.g. {"theme": "beach"}
    
    # Relationships
    user = relationship("User", back_populates="trips")
    trip_plans = relationship("TripPlan", back_populates="trip", cascade="all, delete-orphan")

class TripPlan(Base):
    __tablename__ = "trip_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    
    itinerary = Column(JSON, nullable=True) # Detailed daily plan
    flights = Column(JSON, nullable=True)
    hotels = Column(JSON, nullable=True)
    activities = Column(JSON, nullable=True)
    estimated_cost = Column(Integer, nullable=True)
    
    # Relationships
    trip = relationship("Trip", back_populates="trip_plans")
