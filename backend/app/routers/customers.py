from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from app.database import get_db
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.business import Business
from app.schemas.customer import CustomerCreate, CustomerOut, CustomerUpdate
from app.schemas.payment import PaymentCreate, PaymentOut
from app.core.deps import get_current_business


router = APIRouter(prefix="/customers", tags=["customers"])

@router.post("/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    existing_customer = db.query(Customer).filter(
        Customer.business_id == current_business.id,
        Customer.owner_email == customer_data.email if hasattr(customer_data, 'owner_email') else False
    ).first()
    
    try:
        db_customer = Customer(
            business_id=current_business.id,
            name=customer_data.name,
            phone=customer_data.phone,
            email=customer_data.email,
            address=customer_data.address,
            notes=customer_data.notes,
            balance_due=0.0
        )
        
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)
        
        return db_customer
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create customer: {str(e)}")

@router.get("/", response_model=List[CustomerOut])
def list_customers(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    query = db.query(Customer).filter(Customer.business_id == current_business.id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Customer.name.ilike(search_term),
                Customer.phone.ilike(search_term),
                Customer.email.ilike(search_term)
            )
        )
    
    offset = (page - 1) * limit
    customers = query.order_by(Customer.created_at.desc()).offset(offset).limit(limit).all()
    return customers

@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.business_id == current_business.id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return customer

@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.business_id == current_business.id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    try:
        update_data = customer_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(customer, field, value)
        
        db.commit()
        db.refresh(customer)
        return customer
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update customer: {str(e)}")

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.business_id == current_business.id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    try:
        db.delete(customer)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete customer: {str(e)}")

# ============ PAYMENT ENDPOINTS ============

@router.post("/{customer_id}/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    customer_id: int,
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """Record a payment for a customer and reduce balance_due"""
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.business_id == current_business.id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Validate payment doesn't exceed balance_due
    if payment_data.amount > customer.balance_due + 0.01:  # small tolerance for float
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount Rs. {payment_data.amount:.2f} exceeds balance due Rs. {customer.balance_due:.2f}"
        )
    
    try:
        # Create payment record
        db_payment = Payment(
            business_id=current_business.id,
            customer_id=customer_id,
            amount=payment_data.amount,
            note=payment_data.note
        )
        
        db.add(db_payment)
        
        # Reduce balance_due
        customer.balance_due -= payment_data.amount
        if customer.balance_due < 0:
            customer.balance_due = 0  # Don't allow negative balance
        
        db.commit()
        db.refresh(db_payment)
        
        # Add balance_after to response
        payment_out = PaymentOut(
            id=db_payment.id,
            business_id=db_payment.business_id,
            customer_id=db_payment.customer_id,
            amount=db_payment.amount,
            note=db_payment.note,
            created_at=db_payment.created_at,
            balance_after=customer.balance_due
        )
        
        return payment_out
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record payment: {str(e)}")

@router.get("/{customer_id}/payments", response_model=List[PaymentOut])
def get_customer_payments(
    customer_id: int,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """Get payment history for a customer"""
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.business_id == current_business.id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    payments = db.query(Payment).filter(
        Payment.customer_id == customer_id,
        Payment.business_id == current_business.id
    ).order_by(Payment.created_at.desc()).all()
    
    # Add balance_after to each payment (running total backwards is complex, just show current)
    result = []
    for payment in payments:
        result.append(PaymentOut(
            id=payment.id,
            business_id=payment.business_id,
            customer_id=payment.customer_id,
            amount=payment.amount,
            note=payment.note,
            created_at=payment.created_at,
            balance_after=None
        ))
    
    return result