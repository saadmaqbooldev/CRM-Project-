from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional
import re

class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    
    @field_validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            # Allow digits, +, -, spaces, parentheses
            if not re.match(r'^[0-9+\-\s()]+$', v):
                raise ValueError('Phone number can only contain digits, +, -, spaces, and parentheses')
        return v

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    
    @field_validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            if not re.match(r'^[0-9+\-\s()]+$', v):
                raise ValueError('Phone number can only contain digits, +, -, spaces, and parentheses')
        return v

class CustomerOut(CustomerBase):
    id: int
    business_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True