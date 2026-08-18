from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import timedelta, datetime
import os

from app.database import get_db
from app.models.business import Business
from app.schemas.business import (
    BusinessCreate, BusinessOut, BusinessLogin, Token,
    OTPVerifyRequest, ResendOTPRequest, ForgotPasswordRequest, ResetPasswordRequest
)
from app.core.security import hash_password, verify_password, create_access_token
from app.core.otp import generate_otp, send_otp_email, verify_otp
from app.core.deps import get_current_business

router = APIRouter(prefix="/auth", tags=["authentication"])

# ============ REGISTER ============

@router.post("/register", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
def register_business(
    business_data: BusinessCreate,
    db: Session = Depends(get_db)
):
    # Check if email exists
    existing_business = db.query(Business).filter(
        Business.owner_email == business_data.owner_email
    ).first()
    
    if existing_business:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if phone exists (if provided)
    if business_data.phone:
        existing_phone = db.query(Business).filter(
            Business.phone == business_data.phone
        ).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone number already registered")
    
    try:
        # Generate OTP
        otp = generate_otp()
        otp_expires = datetime.utcnow() + timedelta(minutes=10)
        
        # Create business (unverified)
        hashed_password = hash_password(business_data.password)
        db_business = Business(
            name=business_data.name,
            owner_email=business_data.owner_email,
            phone=business_data.phone,
            password_hash=hashed_password,
            is_verified=False,
            otp_code=otp,
            otp_expires_at=otp_expires
        )
        
        db.add(db_business)
        db.commit()
        db.refresh(db_business)
        
        # Send OTP (prints to terminal in development)
        send_otp_email(business_data.owner_email, otp)
        
        return db_business
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to register business: {str(e)}")

# ============ VERIFY OTP ============

@router.post("/verify-otp")
def verify_registration_otp(
    data: OTPVerifyRequest,
    db: Session = Depends(get_db)
):
    business = db.query(Business).filter(
        Business.owner_email == data.email
    ).first()
    
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if business.is_verified:
        return {"message": "Already verified"}
    
    if not verify_otp(business.otp_code, data.otp, business.otp_expires_at):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    business.is_verified = True
    business.otp_code = None
    business.otp_expires_at = None
    db.commit()
    
    return {"message": "Email verified successfully"}

# ============ RESEND OTP ============

@router.post("/resend-otp")
def resend_otp(
    data: ResendOTPRequest,
    db: Session = Depends(get_db)
):
    business = db.query(Business).filter(
        Business.owner_email == data.email
    ).first()
    
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if business.is_verified:
        return {"message": "Already verified"}
    
    otp = generate_otp()
    business.otp_code = otp
    business.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    
    send_otp_email(data.email, otp)
    
    return {"message": "OTP sent"}

# ============ LOGIN (Email OR Phone) ============

@router.post("/login", response_model=Token)
def login_business(
    business_login: BusinessLogin,
    db: Session = Depends(get_db)
):
    # Find by email OR phone
    business = db.query(Business).filter(
        or_(
            Business.owner_email == business_login.email_or_phone,
            Business.phone == business_login.email_or_phone
        )
    ).first()
    
    if not business:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(business_login.password, business.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if verified
    if not business.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Email not verified. Please verify your email first."
        )
    
    access_token = create_access_token(
        data={"sub": business.owner_email, "business_id": business.id},
        expires_delta=timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30)))
    )
    
    return Token(
        access_token=access_token,
        business_id=business.id,
        business_name=business.name
    )

# ============ FORGOT PASSWORD ============

@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    business = db.query(Business).filter(
        Business.owner_email == data.email
    ).first()
    
    if not business:
        # Don't reveal if email exists
        return {"message": "If the email exists, an OTP has been sent"}
    
    otp = generate_otp()
    business.otp_code = otp
    business.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    
    send_otp_email(data.email, otp)
    
    return {"message": "OTP sent to your email"}

# ============ RESET PASSWORD ============

@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    business = db.query(Business).filter(
        Business.owner_email == data.email
    ).first()
    
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if not verify_otp(business.otp_code, data.otp, business.otp_expires_at):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    business.password_hash = hash_password(data.new_password)
    business.otp_code = None
    business.otp_expires_at = None
    db.commit()
    
    return {"message": "Password reset successfully"}

# ============ GET ME ============

@router.get("/me", response_model=BusinessOut)
def get_me(current_business: Business = Depends(get_current_business)):
    return current_business