from sqlalchemy import Column, String, Integer, ForeignKey, JSON, Enum, DateTime
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from backend.models.base import Base

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
    segments = relationship("Segment", back_populates="trip", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="trip", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="trip", cascade="all, delete-orphan")

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

class Segment(Base):
    __tablename__ = "segments"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String, nullable=False)  # flight | train | bus | hotel | activity
    provider = Column(String, nullable=False)
    provider_ref = Column(String, nullable=True)
    price = Column(Integer, nullable=False)
    currency = Column(String, default="INR")
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    status = Column(String, default="pending")  # pending | confirmed | cancelled
    payload_json = Column(JSON, nullable=True)
    
    # Relationships
    trip = relationship("Trip", back_populates="segments")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    idempotency_key = Column(String, unique=True, index=True, nullable=False)
    provider = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending | held | confirmed | failed | refunded
    amount = Column(Integer, nullable=False)
    provider_order_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    trip = relationship("Trip", back_populates="orders")

class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    data_json = Column(JSON, nullable=True)
    at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    trip = relationship("Trip", back_populates="events")
