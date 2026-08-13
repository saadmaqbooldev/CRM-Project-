from fastapi import FastAPI
from app.routers import auth, customers, products

app = FastAPI(
    title="CRM System API",
    description="Customer Relationship Management System for all businesses",
    version="1.0.0"
)

# Include routers
app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(products.router)

@app.get("/")
def health_check():
    return {"status": "healthy", "message": "CRM API is running"}