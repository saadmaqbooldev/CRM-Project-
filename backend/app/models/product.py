from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=True)
    price = Column(Float, nullable=False, default=0.0)
    stock_qty = Column(Integer, nullable=False, default=0)
    unit = Column(String(20), nullable=True)
    attributes = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())