from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class ProductBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    category: Optional[str] = Field(None, max_length=50)
    barcode: Optional[str] = Field(None, max_length=50)
    price: float = Field(..., gt=0)
    stock_qty: int = Field(..., ge=0)
    unit: Optional[str] = Field(None, max_length=20)
    attributes: Optional[Dict[str, Any]] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    category: Optional[str] = Field(None, max_length=50)
    barcode: Optional[str] = Field(None, max_length=50)
    price: Optional[float] = Field(None, gt=0)
    stock_qty: Optional[int] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=20)
    attributes: Optional[Dict[str, Any]] = None

class ProductOut(ProductBase):
    id: int
    business_id: int
    created_at: datetime
    low_stock: bool = False
    
    class Config:
        from_attributes = True