from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, Dict, Any

class ProductBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    category: Optional[str] = Field(None, max_length=50)
    price: float = Field(..., gt=0, description="Price must be greater than 0")
    stock_qty: int = Field(..., ge=0, description="Stock quantity cannot be negative")
    unit: Optional[str] = Field(None, max_length=20)
    attributes: Optional[Dict[str, Any]] = None
    
    @field_validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    category: Optional[str] = Field(None, max_length=50)
    price: Optional[float] = Field(None, gt=0, description="Price must be greater than 0")
    stock_qty: Optional[int] = Field(None, ge=0, description="Stock quantity cannot be negative")
    unit: Optional[str] = Field(None, max_length=20)
    attributes: Optional[Dict[str, Any]] = None
    
    @field_validator('name')
    def validate_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip() if v else v

class ProductOut(ProductBase):
    id: int
    business_id: int
    created_at: datetime
    low_stock: bool = False
    
    class Config:
        from_attributes = True