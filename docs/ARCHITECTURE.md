# System Architecture

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              Internet                                    │
└──────────────────┬────────────────────────────┬─────────────────────────┘
                   │                            │
          ┌────────▼────────┐         ┌─────────▼──────────┐
          │  CloudFront CDN  │         │     AWS ALB         │
          │  (React SPA)     │         │  (API Gateway)      │
          │  S3 Static Host  │         │                     │
          └────────┬────────┘         └─────────┬──────────┘
                   │                            │
                   │                  ┌─────────▼──────────────────────────┐
                   │                  │         EKS Cluster                │
                   │                  │   Namespace: med-erp               │
                   │                  │                                    │
                   │                  │  ┌───────────┐  ┌───────────────┐  │
                   │                  │  │user-svc   │  │product-svc    │  │
                   │                  │  │:8081      │  │:8082          │  │
                   │                  │  │ 2-6 pods  │  │ 2-8 pods      │  │
                   │                  │  └─────┬─────┘  └──────┬────────┘  │
                   │                  │        │               │            │
                   │                  │  ┌─────▼───────────────▼────────┐  │
                   │                  │  │       order-svc :8083        │  │
                   │                  │  │       2-6 pods                │  │
                   │                  │  └──────────────────────────────┘  │
                   │                  └────────────────────────────────────┘
                   │                            │
                   └────────────────────────────┼────────────┐
                                                │            │
                                    ┌───────────▼──────────────────────┐
                                    │         MongoDB Atlas             │
                                    │  users_db  products_db orders_db  │
                                    └──────────────────────────────────┘
```

## Service Responsibilities (Strict Boundaries)

| Service         | Owns              | Does NOT touch      |
|-----------------|-------------------|---------------------|
| user-service    | users, orgs, audit | products_db, orders_db |
| product-service | products, inventory | users_db, orders_db |
| order-service   | orders, invoices   | users_db, products_db |

Cross-service communication: **API only** (HTTP via WebClient).

## Security Architecture

```
Client Request
     │
     ▼
CloudFront / ALB (TLS termination, WAF)
     │
     ▼
Kubernetes Ingress (path-based routing)
     │
     ├── /auth/*   → user-service (public)
     ├── /users/*  → user-service (JWT required)
     ├── /orgs/*   → user-service (JWT required)
     ├── /products/* → product-service (JWT required)
     └── /orders/* → order-service (JWT required)
                         │
                         ▼
                   JWT Validation Filter
                   (validates signature,
                    expiry, extracts role)
                         │
                         ▼
                   @PreAuthorize
                   (ROLE_ADMIN |
                    ROLE_DISTRIBUTOR |
                    ROLE_HOSPITAL)
```

## Data Flow — Place an Order

```
Hospital User
    │ POST /orders
    ▼
order-service
    │ 1. Validate JWT (hospital role)
    │ 2. GET /products/{id} → product-service (get prices)
    │ 3. Calculate totals with GST
    │ 4. Save order (status=PENDING) → orders_db
    │ 5. Return order response
    ▼
Distributor User
    │ PATCH /orders/{id}/approve
    ▼
order-service
    │ 1. Validate JWT (distributor role)
    │ 2. POST /products/inventory/reserve → product-service
    │ 3. Update order (status=APPROVED)
    │ 4. Return updated order
    ▼
order-service
    │ PATCH /orders/{id}/dispatch
    │ 1. Generate invoice
    │ 2. Update status=DISPATCHED with trackingNumber
```

## MongoDB Index Strategy

```
users_db.users:
  - email (unique)              ← login lookups
  - organizationId              ← org-scoped queries

products_db.products:
  - sku (unique)                ← fast lookup by SKU
  - (category, active)          ← catalog filtering
  - distributorId               ← distributor scope

products_db.inventory:
  - (productId, warehouseId, batchNumber) unique   ← dedup
  - expiryDate                  ← expiry reports

orders_db.orders:
  - orderNumber (unique)        ← direct lookup
  - (buyerOrgId, status)        ← hospital dashboard
  - (distributorOrgId, status)  ← distributor dashboard
  - createdAt                   ← time-range reporting
```
