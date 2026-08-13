from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class BusinessBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    owner_email: EmailStr

class BusinessCreate(BusinessBase):
    password: str = Field(..., min_length=6, max_length=72)

class BusinessLogin(BaseModel):
    email: EmailStr
    password: str

class BusinessOut(BusinessBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    business_id: int
    business_name: str