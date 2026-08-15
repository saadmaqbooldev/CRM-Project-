from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class PaymentCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Payment amount must be greater than 0")
    note: Optional[str] = None

class PaymentOut(BaseModel):
    id: int
    business_id: int
    customer_id: int
    amount: float
    note: Optional[str]
    created_at: datetime
    balance_after: Optional[float] = None
    
    class Config:
        from_attributes = True