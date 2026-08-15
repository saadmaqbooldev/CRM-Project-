from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta

from app.database import get_db
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.customer import Customer
from app.models.product import Product
from app.models.business import Business
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate, ReceiptOut, ReceiptItem, QuickSaleCreate
from app.core.deps import get_current_business

router = APIRouter(prefix="/orders", tags=["orders"])

def generate_receipt_no(order_id: int) -> str:
    return f"INV-{order_id:04d}"

def serialize_order(order: Order) -> dict:
    order_dict = {
        "id": order.id,
        "business_id": order.business_id,
        "customer_id": order.customer_id,
        "customer_name": order.customer.name if order.customer else None,
        "receipt_no": order.receipt_no,
        "status": order.status,
        "total_amount": order.total_amount,
        "notes": order.notes,
        "created_at": order.created_at,
        "items": []
    }
    
    for item in order.items:
        order_dict["items"].append({
            "id": item.id,
            "order_id": item.order_id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "product_name": item.product.name if item.product else None
        })
    
    return order_dict

def process_order_items(
    items: List,
    db: Session,
    current_business: Business
) -> tuple:
    """Validate products, calculate total, deduct stock. Returns (total, order_items_list)"""
    total_amount = 0.0
    order_items = []
    
    for item in items:
        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.business_id == current_business.id
        ).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item.product_id} not found"
            )
        
        if product.stock_qty < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for product: {product.name}. Available: {product.stock_qty}"
            )
        
        unit_price = product.price
        total_amount += unit_price * item.quantity
        product.stock_qty -= item.quantity
        
        order_items.append({
            "product_id": product.id,
            "quantity": item.quantity,
            "unit_price": unit_price
        })
    
    return total_amount, order_items

def save_order(
    db: Session,
    current_business: Business,
    customer_id: Optional[int],
    total_amount: float,
    notes: Optional[str],
    order_status: str,
    order_items: List
) -> Order:
    """Save order and items to database"""
    db_order = Order(
        business_id=current_business.id,
        customer_id=customer_id,
        status=order_status,
        total_amount=total_amount,
        notes=notes
    )
    
    db.add(db_order)
    db.flush()
    db_order.receipt_no = generate_receipt_no(db_order.id)
    
    for item_data in order_items:
        db_order_item = OrderItem(
            order_id=db_order.id,
            product_id=item_data["product_id"],
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"]
        )
        db.add(db_order_item)
    
    db.commit()
    db.refresh(db_order)
    return db_order

@router.post("/quick-sale", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_quick_sale(
    sale_data: QuickSaleCreate,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """Create a quick sale — instantly completed (for walk-in retail/medical sales)"""
    
    customer_id = sale_data.customer_id
    
    # If no customer_id provided, create a walk-in customer
    if not customer_id:
        walk_in_name = sale_data.customer_name or "Walk-in Customer"
        
        # Check if walk-in customer already exists
        walk_in = db.query(Customer).filter(
            Customer.business_id == current_business.id,
            Customer.name == walk_in_name
        ).first()
        
        if walk_in:
            customer_id = walk_in.id
        else:
            walk_in = Customer(
                business_id=current_business.id,
                name=walk_in_name,
                notes="Walk-in customer"
            )
            db.add(walk_in)
            db.flush()
            customer_id = walk_in.id
    
    # Validate customer belongs to business
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.business_id == current_business.id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    try:
        # Process items and deduct stock
        total_amount, order_items = process_order_items(
            sale_data.items, db, current_business
        )
        
        # Save as completed order
        db_order = save_order(
            db=db,
            current_business=current_business,
            customer_id=customer_id,
            total_amount=total_amount,
            notes=sale_data.notes,
            order_status="completed",
            order_items=order_items
        )
        
        return serialize_order(db_order)
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create quick sale: {str(e)}"
        )

@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """Create a new order with pending status (for dine-in orders)"""
    
    customer = db.query(Customer).filter(
        Customer.id == order_data.customer_id,
        Customer.business_id == current_business.id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    try:
        total_amount, order_items = process_order_items(
            order_data.items, db, current_business
        )
        
        db_order = save_order(
            db=db,
            current_business=current_business,
            customer_id=order_data.customer_id,
            total_amount=total_amount,
            notes=order_data.notes,
            order_status="pending",
            order_items=order_items
        )
        
        return serialize_order(db_order)
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}"
        )

@router.get("/", response_model=List[OrderOut])
def list_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    query = db.query(Order).filter(Order.business_id == current_business.id)
    
    if status_filter:
        query = query.filter(Order.status == status_filter)
    if customer_id:
        query = query.filter(Order.customer_id == customer_id)
    if date_from:
        query = query.filter(Order.created_at >= date_from)
    if date_to:
        query = query.filter(Order.created_at < date_to + timedelta(days=1))
    
    offset = (page - 1) * limit
    orders = query.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()
    return [serialize_order(order) for order in orders]

@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.business_id == current_business.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return serialize_order(order)

@router.get("/{order_id}/receipt", response_model=ReceiptOut)
def get_order_receipt(
    order_id: int,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.business_id == current_business.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    receipt_items = []
    for item in order.items:
        product_name = item.product.name if item.product else f"Product #{item.product_id}"
        receipt_items.append(ReceiptItem(
            product_name=product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=item.quantity * item.unit_price
        ))
    
    return ReceiptOut(
        receipt_no=order.receipt_no or f"INV-{order.id:04d}",
        order_id=order.id,
        business_name=current_business.name,
        customer_name=order.customer.name if order.customer else "Walk-in Customer",
        order_date=order.created_at,
        status=order.status,
        items=receipt_items,
        total_amount=order.total_amount,
        notes=order.notes
    )

@router.put("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    status_data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.business_id == current_business.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    try:
        if status_data.status == "cancelled" and order.status != "cancelled":
            for item in order.items:
                product = db.query(Product).filter(
                    Product.id == item.product_id,
                    Product.business_id == current_business.id
                ).first()
                if product:
                    product.stock_qty += item.quantity
        
        order.status = status_data.status
        db.commit()
        db.refresh(order)
        return serialize_order(order)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")