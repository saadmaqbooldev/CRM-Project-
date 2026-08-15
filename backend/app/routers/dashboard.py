from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta, date
from typing import Dict, Any

from app.database import get_db
from app.models.customer import Customer
from app.models.product import Product
from app.models.order import Order
from app.models.business import Business
from app.core.deps import get_current_business

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """Get dashboard summary stats"""
    
    business_id = current_business.id
    
    # Total customers
    total_customers = db.query(func.count(Customer.id)).filter(
        Customer.business_id == business_id
    ).scalar()
    
    # Total products
    total_products = db.query(func.count(Product.id)).filter(
        Product.business_id == business_id
    ).scalar()
    
    # Low stock products
    low_stock_products = db.query(func.count(Product.id)).filter(
        Product.business_id == business_id,
        Product.stock_qty < 5
    ).scalar()
    
    # Today's date
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    
    # Week start (Monday)
    week_start = today_start - timedelta(days=today.weekday())
    
    # Month start
    month_start = today_start.replace(day=1)
    
    # Sales today
    sales_today = db.query(func.coalesce(func.sum(Order.total_amount), 0.0)).filter(
        Order.business_id == business_id,
        Order.status == "completed",
        Order.created_at >= today_start
    ).scalar()
    
    # Sales this week
    sales_week = db.query(func.coalesce(func.sum(Order.total_amount), 0.0)).filter(
        Order.business_id == business_id,
        Order.status == "completed",
        Order.created_at >= week_start
    ).scalar()
    
    # Sales this month
    sales_month = db.query(func.coalesce(func.sum(Order.total_amount), 0.0)).filter(
        Order.business_id == business_id,
        Order.status == "completed",
        Order.created_at >= month_start
    ).scalar()
    
    # Total revenue (all completed orders)
    total_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0.0)).filter(
        Order.business_id == business_id,
        Order.status == "completed"
    ).scalar()
    
    # Orders by status
    orders_by_status = {}
    statuses = ["pending", "completed", "cancelled"]
    
    for status_name in statuses:
        count = db.query(func.count(Order.id)).filter(
            Order.business_id == business_id,
            Order.status == status_name
        ).scalar()
        orders_by_status[status_name] = count
    
    # Total orders
    total_orders = sum(orders_by_status.values())
    
    # Recent orders (last 5)
    recent_orders = db.query(Order).filter(
        Order.business_id == business_id
    ).order_by(Order.created_at.desc()).limit(5).all()
    
    recent_orders_list = []
    for order in recent_orders:
        recent_orders_list.append({
            "id": order.id,
            "customer_name": order.customer.name if order.customer else "Unknown",
            "total_amount": order.total_amount,
            "status": order.status,
            "created_at": order.created_at.isoformat()
        })
    
    return {
        "business_name": current_business.name,
        "total_customers": total_customers,
        "total_products": total_products,
        "low_stock_products": low_stock_products,
        "sales": {
            "today": round(sales_today, 2),
            "this_week": round(sales_week, 2),
            "this_month": round(sales_month, 2),
            "total_revenue": round(total_revenue, 2)
        },
        "orders": {
            "total": total_orders,
            "by_status": orders_by_status
        },
        "recent_orders": recent_orders_list
    }

@router.get("/top-customers")
def get_top_customers(
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """Get top customers by order count"""
    
    top_customers = db.query(
        Customer.id,
        Customer.name,
        Customer.email,
        func.count(Order.id).label("order_count"),
        func.coalesce(func.sum(Order.total_amount), 0.0).label("total_spent")
    ).join(
        Order, Order.customer_id == Customer.id
    ).filter(
        Customer.business_id == current_business.id,
        Order.business_id == current_business.id,
        Order.status == "completed"
    ).group_by(
        Customer.id,
        Customer.name,
        Customer.email
    ).order_by(
        func.count(Order.id).desc()
    ).limit(5).all()
    
    result = []
    for customer in top_customers:
        result.append({
            "customer_id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "order_count": customer.order_count,
            "total_spent": round(customer.total_spent, 2)
        })
    
    return result

@router.get("/low-stock")
def get_low_stock_products(
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """Get low stock products"""
    
    products = db.query(Product).filter(
        Product.business_id == current_business.id,
        Product.stock_qty < 5
    ).order_by(Product.stock_qty.asc()).all()
    
    result = []
    for product in products:
        result.append({
            "id": product.id,
            "name": product.name,
            "category": product.category,
            "stock_qty": product.stock_qty,
            "unit": product.unit
        })
    
    return result