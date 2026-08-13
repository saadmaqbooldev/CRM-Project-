from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError
from app.database import get_db
from app.models.business import Business
from app.core.security import decode_access_token

security = HTTPBearer()

def get_current_business(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Business:
    """Get current authenticated business from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    
    # Decode token
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    # Get business ID from token
    business_id = payload.get("business_id")
    if business_id is None:
        raise credentials_exception
    
    # Get business from database
    business = db.query(Business).filter(Business.id == business_id).first()
    if business is None:
        raise credentials_exception
    
    return business