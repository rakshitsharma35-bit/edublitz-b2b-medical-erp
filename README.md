# EduBlitz Medical B2B ERP System

A production-grade **Medical Domain B2B ERP** for hospitals, distributors, and administrators. The stack is **three Spring Boot microservices**, a **React (Vite)** SPA, and **MongoDB** (Atlas or self-hosted).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CloudFront CDN                           │
│                    (React Frontend via S3)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              AWS ALB Ingress Controller (EKS)                   │
└──────┬─────────────────────┬──────────────────────┬─────────────┘
       │                     │                      │
┌──────▼──────┐    ┌─────────▼────────┐   ┌────────▼────────┐
│ user-service│    │ product-service  │   │  order-service  │
│  Port: 8081 │    │   Port: 8082     │   │   Port: 8083    │
│             │    │                  │   │                 │
│ Auth / JWT  │    │ Catalog / Stock  │   │ Order lifecycle │
│ Roles/Orgs  │    │ Batches / Reserve│   │ (+ product API) │
└──────┬──────┘    └─────────┬────────┘   └────────┬────────┘
       │                     │                      │
┌──────▼─────────────────────▼──────────────────────▼─────────────┐
│                     MongoDB Atlas (or local)                      │
│   users_db          products_db            orders_db             │
└───────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Frontend     | React 18 + Vite + TailwindCSS + TanStack Query  |
| Backend      | Spring Boot 3.x (3 microservices)               |
| Database     | MongoDB (Atlas recommended)                     |
| Auth         | JWT (HMAC-SHA256 / HS256), shared secret        |
| Cloud        | AWS (EKS, S3, CloudFront, Route53) — optional   |
| IaC          | Terraform (modular)                             |
| CI/CD        | Jenkins (see `jenkins/`)                        |
| Containers   | Docker + Kubernetes manifests in `k8s/`        |
| API Docs     | Swagger / OpenAPI 3.0 per service               |

## Domain Highlights

- **Catalog**: Active products only appear in hospital/distributor listings; soft-deleted products free their **SKU** for reuse.
- **Inventory**: Stock is tracked per **product + warehouse + batch** (`POST /products/inventory`). **Available** (sellable) = stored quantity minus reserved.
- **Orders**: Hospitals place orders; **distributors** (or admins) **approve** only when enough sellable stock exists — approval calls product-service to **reserve** stock (multi-batch allocation). Distributors only act on orders assigned to their **organization ID**.
- **Admin UI**: Organization **MongoDB IDs** are listed under **Organizations** for integration and user registration.

## Services

| Service         | Port | Responsibilities |
|-----------------|------|------------------|
| user-service    | 8081 | Auth, JWT, users, organizations, audit hooks |
| product-service | 8082 | Products, inventory batches, reserve/release APIs |
| order-service   | 8083 | Orders; calls product-service over HTTP with forwarded JWT |

## Roles

| Role        | Access |
|-------------|--------|
| ADMIN       | Organizations, all products/inventory (scoped APIs), all orders |
| DISTRIBUTOR | Own catalog & stock batches, incoming orders for own org |
| HOSPITAL    | Browse catalog, create/track own org’s orders |

## Project Structure

```
├── frontend/           # React + Vite (HashRouter for static hosting)
├── user-service/
├── product-service/
├── order-service/
├── docker/
├── k8s/
├── terraform/
├── jenkins/
└── docs/               # Deployment & architecture guides
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/README.md](docs/README.md) | Index of all guides |
| [docs/MANUAL_DEPLOYMENT.md](docs/MANUAL_DEPLOYMENT.md) | Run services locally without Docker |
| [docs/DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md) | Docker Compose |
| [docs/KUBERNETES_DEPLOYMENT.md](docs/KUBERNETES_DEPLOYMENT.md) | Kubernetes / EKS |
| [docs/TERRAFORM_DEPLOYMENT.md](docs/TERRAFORM_DEPLOYMENT.md) | AWS infrastructure |
| [docs/JENKINS_DEPLOYMENT.md](docs/JENKINS_DEPLOYMENT.md) | CI/CD pipelines |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Service boundaries & data flows |

## Quick Start

1. **Local (no Docker):** [MANUAL_DEPLOYMENT.md](docs/MANUAL_DEPLOYMENT.md) — use app URLs with `/#/` (HashRouter), e.g. `http://localhost:5173/#/login`.
2. **Docker Compose:** [DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md)
3. **Kubernetes:** [KUBERNETES_DEPLOYMENT.md](docs/KUBERNETES_DEPLOYMENT.md)
4. **Terraform (AWS):** [TERRAFORM_DEPLOYMENT.md](docs/TERRAFORM_DEPLOYMENT.md)

## Prerequisites

- Java 17+
- Node.js 18+
- Docker & Docker Compose (optional)
- MongoDB 6+ (or Atlas)
- **Same `JWT_SECRET` (Base64-encoded key bytes)** on every service that validates JWTs — see each service’s `.env.example`.

## Environment Variables

Copy `.env.example` → `.env` in each service and in `frontend` (e.g. `.env.local`). Never commit real secrets.

## Security Notes

- APIs are authenticated with Bearer JWT except documented public auth routes.
- **order-service → product-service** uses HTTP + forwarded JWT (no direct DB access across services).
- Use Kubernetes Secrets / AWS Secrets Manager in production.
- Jenkins pipelines may run **SonarCloud** and **Trivy** when credentials are configured (`jenkins/`).

## Development

```bash
# Frontend
cd frontend && npm install && npm run dev
npm run lint && npm run build   # ESLint config: .eslintrc.cjs

# Each backend
cd user-service && mvn clean compile
```

## License

Private / Proprietary — EduBlitz DevOps Project
