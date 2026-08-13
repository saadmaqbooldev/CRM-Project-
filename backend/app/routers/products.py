from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from app.database import get_db
from app.models.product import Product
from app.models.business import Business
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.core.deps import get_current_business

router = APIRouter(prefix="/products", tags=["products"])

LOW_STOCK_THRESHOLD = 5

def check_low_stock(stock_qty: int) -> bool:
    """Check if product is low on stock"""
    return stock_qty < LOW_STOCK_THRESHOLD

@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """Create a new product for current business"""
    try:
        db_product = Product(
            business_id=current_business.id,
            name=product_data.name,
            category=product_data.category,
            price=product_data.price,
            stock_qty=product_data.stock_qty,
            unit=product_data.unit,
            attributes=product_data.attributes
        )
        
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        
        # Add low_stock flag to response
        product_out = ProductOut.from_orm(db_product)
        product_out.low_stock = check_low_stock(db_product.stock_qty)
        
        return product_out
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create product: {str(e)}"
        )

@router.get("/", response_model=List[ProductOut])
def list_products(
    search: Optional[str] = Query(None, description="Search by name or category"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    category: Optional[str] = Query(None, description="Filter by category"),
    low_stock_only: bool = Query(False, description="Show only low stock products"),
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """List products with search, category filter, pagination, and low stock filter"""
    query = db.query(Product).filter(
        Product.business_id == current_business.id
    )
    
    # Search by name or category
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_term),
                Product.category.ilike(search_term)
            )
        )
    
    # Filter by category
    if category:
        query = query.filter(Product.category == category)
    
    # Filter low stock products
    if low_stock_only:
        query = query.filter(Product.stock_qty < LOW_STOCK_THRESHOLD)
    
    # Pagination
    offset = (page - 1) * limit
    products = query.order_by(Product.created_at.desc()).offset(offset).limit(limit).all()
    
    # Add low_stock flag to each product
    result = []
    for product in products:
        product_out = ProductOut.from_orm(product)
        product_out.low_stock = check_low_stock(product.stock_qty)
        result.append(product_out)
    
    return result

@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """Get a single product by ID"""
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == current_business.id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Add low_stock flag
    product_out = ProductOut.from_orm(product)
    product_out.low_stock = check_low_stock(product.stock_qty)
    
    return product_out

@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """Update a product by ID"""
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == current_business.id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    try:
        # Update only provided fields
        update_data = product_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(product, field, value)
        
        db.commit()
        db.refresh(product)
        
        # Add low_stock flag
        product_out = ProductOut.from_orm(product)
        product_out.low_stock = check_low_stock(product.stock_qty)
        
        return product_out
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update product: {str(e)}"
        )

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_business: Business = Depends(get_current_business)
):
    """Delete a product by ID"""
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == current_business.id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    try:
        db.delete(product)
        db.commit()
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete product: {str(e)}"
        )