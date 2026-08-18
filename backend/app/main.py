from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, customers, products, orders, dashboard, reports

app = FastAPI(
    title="Kova CRM API",
    description="Customer Relationship Management System for all businesses",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://kova-crm.vercel.app",  # Production Vercel URL
        "https://kova-crm-git-main.vercel.app",  # Preview deployments
        "https://*.vercel.app",  # All Vercel preview URLs
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(dashboard.router)
app.include_router(reports.router)

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "message": "Kova CRM API is running",
        "version": "1.0.0"
    }