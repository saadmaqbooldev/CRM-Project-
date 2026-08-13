from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
import os

from app.database import get_db
from app.models.business import Business
from app.schemas.business import BusinessCreate, BusinessOut, BusinessLogin, Token
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_business

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
def register_business(business_data: BusinessCreate, db: Session = Depends(get_db)):
    """Register a new business"""
    # Check if email already exists
    existing_business = db.query(Business).filter(
        Business.owner_email == business_data.owner_email
    ).first()
    
    if existing_business:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        # Create new business
        hashed_password = hash_password(business_data.password)
        db_business = Business(
            name=business_data.name,
            owner_email=business_data.owner_email,
            password_hash=hashed_password
        )
        
        db.add(db_business)
        db.commit()
        db.refresh(db_business)
        
        return db_business
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register business: {str(e)}"
        )

@router.post("/login", response_model=Token)
def login_business(business_login: BusinessLogin, db: Session = Depends(get_db)):
    """Login a business and return JWT token"""
    # Find business by email
    business = db.query(Business).filter(
        Business.owner_email == business_login.email
    ).first()
    
    # Don't reveal if email exists or not (security)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(business_login.password, business.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30)))
    access_token = create_access_token(
        data={"sub": business.owner_email, "business_id": business.id},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        business_id=business.id,
        business_name=business.name
    )

@router.get("/me", response_model=BusinessOut)
def get_me(current_business: Business = Depends(get_current_business)):
    """Get current logged-in business info"""
    return current_business