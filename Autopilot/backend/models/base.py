from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import declared_attr
from datetime import datetime
from sqlalchemy import Column, DateTime

class CustomBase:
    @declared_attr
    def __tablename__(cls):
        return cls.__name__.lower()
        
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

Base = declarative_base(cls=CustomBase)
