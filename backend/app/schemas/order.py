from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class OrderCreate(BaseModel):
    customer_id: int
    notes: Optional[str] = None
    payment_type: str = Field(default="cash", pattern="^(cash|credit)$")
    items: List[OrderItemCreate] = Field(..., min_length=1)

class QuickSaleCreate(BaseModel):
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    notes: Optional[str] = None
    payment_type: str = Field(default="cash", pattern="^(cash|credit)$")
    items: List[OrderItemCreate] = Field(..., min_length=1)

class OrderItemOut(BaseModel):
    id: int
    order_id: int
    product_id: int
    quantity: int
    unit_price: float
    product_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: int
    business_id: int
    customer_id: int
    customer_name: Optional[str] = None
    receipt_no: Optional[str] = None
    status: str
    payment_type: str
    total_amount: float
    notes: Optional[str]
    created_at: datetime
    items: List[OrderItemOut]
    
    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|completed|cancelled)$")

class ReceiptItem(BaseModel):
    product_name: str
    quantity: int
    unit_price: float
    line_total: float

class ReceiptOut(BaseModel):
    receipt_no: str
    order_id: int
    business_name: str
    customer_name: str
    order_date: datetime
    status: str
    payment_type: str
    items: List[ReceiptItem]
    total_amount: float
    notes: Optional[str] = None