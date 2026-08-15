from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, date, timedelta

from app.database import get_db
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.customer import Customer
from app.models.product import Product
from app.models.business import Business
from app.core.deps import get_current_business

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/sales")
def sales_report(
    date_from: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """Get sales report for date range"""
    
    query = db.query(
        func.date(Order.created_at).label("date"),
        func.count(Order.id).label("order_count"),
        func.coalesce(func.sum(Order.total_amount), 0.0).label("revenue")
    ).filter(
        Order.business_id == current_business.id,
        Order.status == "completed"
    )
    
    # Apply date filters
    if date_from:
        query = query.filter(Order.created_at >= date_from)
    
    if date_to:
        date_to_end = date_to + timedelta(days=1)
        query = query.filter(Order.created_at < date_to_end)
    
    # Group by date
    daily_sales = query.group_by(func.date(Order.created_at)).order_by(
        func.date(Order.created_at)
    ).all()
    
    # Calculate totals
    total_revenue = sum(item.revenue for item in daily_sales)
    total_orders = sum(item.order_count for item in daily_sales)
    
    report = []
    for item in daily_sales:
        report.append({
            "date": str(item.date),
            "order_count": item.order_count,
            "revenue": round(item.revenue, 2)
        })
    
    return {
        "total_revenue": round(total_revenue, 2),
        "total_orders": total_orders,
        "daily_breakdown": report
    }

@router.get("/top-customers")
def top_customers_report(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """Get top customers by revenue"""
    
    top_customers = db.query(
        Customer.id,
        Customer.name,
        Customer.email,
        Customer.phone,
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
        Customer.email,
        Customer.phone
    ).order_by(
        func.sum(Order.total_amount).desc()
    ).limit(limit).all()
    
    result = []
    for customer in top_customers:
        result.append({
            "customer_id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "order_count": customer.order_count,
            "total_spent": round(customer.total_spent, 2)
        })
    
    return result

@router.get("/top-products")
def top_products_report(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """Get top products by quantity sold and revenue"""
    
    top_products = db.query(
        Product.id,
        Product.name,
        Product.category,
        func.coalesce(func.sum(OrderItem.quantity), 0).label("quantity_sold"),
        func.coalesce(func.sum(OrderItem.quantity * OrderItem.unit_price), 0.0).label("total_revenue")
    ).join(
        OrderItem, OrderItem.product_id == Product.id
    ).join(
        Order, Order.id == OrderItem.order_id
    ).filter(
        Product.business_id == current_business.id,
        Order.business_id == current_business.id,
        Order.status == "completed"
    ).group_by(
        Product.id,
        Product.name,
        Product.category
    ).order_by(
        func.sum(OrderItem.quantity).desc()
    ).limit(limit).all()
    
    result = []
    for product in top_products:
        result.append({
            "product_id": product.id,
            "name": product.name,
            "category": product.category,
            "quantity_sold": product.quantity_sold,
            "total_revenue": round(product.total_revenue, 2)
        })
    
    return result