from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class BusinessBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    owner_email: EmailStr

class BusinessCreate(BusinessBase):
    phone: Optional[str] = Field(None, max_length=20)
    password: str = Field(..., min_length=6, max_length=72)

class BusinessLogin(BaseModel):
    email_or_phone: str = Field(..., min_length=3)
    password: str

class BusinessOut(BusinessBase):
    id: int
    phone: Optional[str] = None
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    business_id: int
    business_name: str

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)

class ResendOTPRequest(BaseModel):
    email: EmailStr

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6, max_length=72)