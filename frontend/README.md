# Universal CRM + POS System

A generic, multi-tenant CRM and Point-of-Sale system built for small businesses — medical stores, restaurants, shops, and wholesalers — all running on the same platform with fully isolated data per business.

**Author:** Saad Maqbool
**Status:** Core system + POS + Credit Tracking + Bulk Import 
**Repo:** github.com/saadmaqbooldev

---

## What This Is

Instead of building a separate CRM per industry, this system is built around three universal entities every business already has — **Customers**, **Products (items)**, and **Orders (sales)**. A medical store sells medicine, a restaurant sells dishes, a shop sells goods, a wholesaler sells bulk items — to the system, they're all just "products" with a price and a stock quantity. This keeps one codebase working for every business type.

Each business gets its own account. Data is fully isolated — a medical store owner can never see a restaurant owner's customers, products, or sales, even though everyone runs on the same deployed app and same database.

---

## Core Features

- **Multi-tenant accounts** — one login per business, complete data isolation via `business_id`
- **Customer management** — add, edit, search customers; view purchase history
- **Product/inventory management** — add, edit, search products; stock quantity tracking; low-stock alerts
- **Point of Sale (POS)** — fast search-and-sell screen: search item → add to cart → checkout → stock auto-deducts
- **Receipt printing** — printable slip after every sale (thermal printer via browser print, or PDF)
- **Sales dashboard** — today/week/month totals, top products, top customers
- **Reports** — date-range sales reports, exportable as CSV
- **Customer credit / udhaar tracking** — record credit sales, track balance owed, record partial/full payments, see outstanding balances at a glance
- **Bulk product import** — upload a CSV/Excel file to add hundreds of products at once, with a downloadable template and clear error reporting for bad rows
- **Barcode scanning** — scan products at checkout for instant add-to-cart, and scan while adding new stock to auto-fill product forms; works with any standard USB barcode scanner (no special drivers needed)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| ORM / Migrations | SQLAlchemy + Alembic |
| Auth | JWT |
| Frontend | Next.js (React) |
| Styling | Tailwind CSS |
| Data fetching | React Query (TanStack Query) |
| Charts | Recharts |
| File import | pandas + openpyxl |
| Backend hosting | Railway / Render |
| Frontend hosting | Vercel |

---

## System Architecture

```
Next.js Frontend (Vercel)
        │  REST API, JWT auth
FastAPI Backend (Railway/Render)
        │  SQLAlchemy ORM
PostgreSQL Database (multi-tenant, business_id on every table)
```

---

## Database Schema (Core)

- **businesses** — id, name, owner_email, password_hash, created_at
- **customers** — id, business_id (FK), name, phone, email, address, notes, balance_due, created_at
- **products** — id, business_id (FK), name, category, price, stock_qty, unit, barcode, attributes (JSONB), created_at
- **orders** — id, business_id (FK), customer_id (FK), status, payment_type (cash/credit), total_amount, receipt_no, created_at
- **order_items** — id, order_id (FK), product_id (FK), quantity, unit_price
- **payments** — id, business_id (FK), customer_id (FK), amount, note, created_at

---

## API Endpoints

### Auth
```
POST   /auth/register
POST   /auth/login
GET    /auth/me
```

### Customers
```
GET    /customers
POST   /customers
GET    /customers/{id}
PUT    /customers/{id}
DELETE /customers/{id}
POST   /customers/{id}/payments
GET    /customers/{id}/payments
```

### Products
```
GET    /products
POST   /products
GET    /products/{id}
PUT    /products/{id}
DELETE /products/{id}
POST   /products/import
GET    /products/import-template
GET    /products/by-barcode/{barcode}
```

### Orders / Sales
```
GET    /orders
POST   /orders
POST   /orders/quick-sale
GET    /orders/{id}
GET    /orders/{id}/receipt
PUT    /orders/{id}/status
```

### Dashboard / Reports
```
GET    /dashboard/summary
GET    /reports/sales
GET    /reports/top-customers
GET    /reports/top-products
GET    /reports/outstanding-balances
```

All endpoints except `/auth/register` and `/auth/login` require a JWT bearer token and are scoped to the logged-in business.

---

## Project Structure

```
crm-project/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models/        (business, customer, product, order, order_item, payment)
│   │   ├── schemas/       (Pydantic request/response models)
│   │   ├── routers/       (auth, customers, products, orders, dashboard)
│   │   ├── core/          (security, JWT, config)
│   │   └── crud/          (DB operation helpers)
│   ├── alembic/
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── app/               (login, dashboard, customers, products, orders, pos, reports)
│   ├── components/
│   ├── lib/                (api client, auth helpers)
│   └── package.json
└── README.md
```

---

## Development Roadmap (54 Days)

| Days | Phase |
|---|---|
| 1–5 | Backend foundation — DB setup, auth, JWT |
| 6–10 | Customers & Products CRUD |
| 11–15 | Orders — stock deduction, totals, dashboard, reports |
| 16–20 | Frontend setup — Next.js, auth pages, protected routes, layout |
| 21–25 | Core frontend screens — customers, products, order creation |
| 26–30 | Dashboard UI, reports UI, polish, responsive, QA |
| 31–38 | POS extension — quick-sale screen, receipt printing, stock visibility |
| 39–41 | Deployment — backend, frontend, README, demo |
| 42–48 | Credit/udhaar tracking — balance, payments, outstanding report |
| 49–54 | Bulk product import — file upload, template, error handling, redeploy |
| 55–59 | Barcode scanning — POS instant lookup, product form auto-fill, testing |

**Current status:** Days 1–54 complete. Day 55–59 (barcode scanning) in progress.

---

## Deployment & Cost

| Item | Cost |
|---|---|
| Backend hosting (Railway/Render) | Free tier to start, ~$5–20/month at scale |
| Database (PostgreSQL) | Often bundled, ~$0–15/month |
| Frontend hosting (Vercel) | Free for most small-business traffic |
| Domain name | ~$10–15/year |
| Thermal receipt printer (per store, one-time) | PKR 8,000–15,000 |

Recommended path: deploy on free tiers first for pilot stores, upgrade to paid tiers once a real business depends on it daily.

---

## Competitive Position

Compared to established local POS/CRM platforms (e.g., Vaypar.pk), this system covers the same core loop — search or scan, sell, deduct stock, print slip, multi-business isolation — plus credit/udhaar tracking, bulk import, and barcode scanning. It does not yet include native mobile apps, full accounting/ledgers, multi-location per business, OCR bill scanning, or industry-specific modules (pharmacy batch/expiry, restaurant table management) — these are natural next steps once there are real paying customers requesting them.

---

## Next Steps After This Roadmap

- Real-world pilot test with one actual shop before adding more features
- WhatsApp receipt/reminder sharing
- Industry-specific optional fields (e.g., medicine expiry dates) via the existing flexible `attributes` JSONB column — no schema changes needed
- AI features: sales forecasting, product recommendations, natural-language reporting

---

## License
Personal/portfolio project — license terms to be added before public/commercial release.