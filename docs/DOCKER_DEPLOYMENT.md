# Docker Deployment Guide

Run the entire stack with a single command using Docker Compose.

---

## Prerequisites

- Docker Desktop 4.x+ (or Docker Engine 24+)
- Docker Compose v2 (`docker compose` not `docker-compose`)

---

## Step 1 — Configure Environment

```bash
cd docker
cp .env.example .env

# Edit .env and set:
# MONGO_ROOT_PASSWORD=your-secure-password
# JWT_SECRET=your-256-bit-hex-secret (same for all services)
```

---

## Step 2 — Build All Images

```bash
# From project root
docker compose -f docker/docker-compose.yml build

# Or build a single service
docker compose -f docker/docker-compose.yml build user-service
```

---

## Step 3 — Start the Stack

```bash
# Start everything (detached)
docker compose -f docker/docker-compose.yml up -d

# Watch startup logs
docker compose -f docker/docker-compose.yml logs -f
```

**Wait for all services to show `healthy` status:**
```bash
docker compose -f docker/docker-compose.yml ps
```

Expected output:
```
NAME                    STATUS              PORTS
med-erp-mongodb         Up (healthy)        0.0.0.0:27017->27017/tcp
med-erp-user-service    Up (healthy)        0.0.0.0:8081->8081/tcp
med-erp-product-service Up (healthy)        0.0.0.0:8082->8082/tcp
med-erp-order-service   Up (healthy)        0.0.0.0:8083->8083/tcp
med-erp-frontend        Up (healthy)        0.0.0.0:3000->80/tcp
```

---

## Step 4 — Access the Application

| URL                               | Description                  |
|-----------------------------------|------------------------------|
| http://localhost:3000             | Frontend (React App)         |
| http://localhost:8081/api/v1/swagger-ui.html | User Service Swagger |
| http://localhost:8082/api/v1/swagger-ui.html | Product Service Swagger |
| http://localhost:8083/api/v1/swagger-ui.html | Order Service Swagger |

---

## Useful Commands

```bash
# Stop the stack
docker compose -f docker/docker-compose.yml down

# Stop and remove volumes (DANGER: deletes all data)
docker compose -f docker/docker-compose.yml down -v

# Restart a single service
docker compose -f docker/docker-compose.yml restart user-service

# View logs for a specific service
docker compose -f docker/docker-compose.yml logs -f order-service

# Execute a command in a running container
docker exec -it med-erp-user-service sh

# Check MongoDB data
docker exec -it med-erp-mongodb mongosh -u admin -p <password> --authenticationDatabase admin
```

---

## Building for Production (ECR push)

```bash
# Set your ECR registry
export ECR_REGISTRY="123456789012.dkr.ecr.us-east-1.amazonaws.com"
export IMAGE_TAG="v1.0.0"

# ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

# Build and push each service
for svc in user-service product-service order-service; do
  docker build -t $ECR_REGISTRY/med-erp/$svc:$IMAGE_TAG $svc/
  docker push $ECR_REGISTRY/med-erp/$svc:$IMAGE_TAG
done
```

---

## Troubleshooting

| Issue                          | Fix                                                |
|--------------------------------|----------------------------------------------------|
| Service unhealthy              | `docker compose logs <service>` to see error       |
| MongoDB permission denied      | Check MONGO_ROOT_PASSWORD matches in .env          |
| Port conflict                  | Change host port in docker-compose.yml             |
| Image build fails              | Check Java 17 / Node 20 available or use BuildKit  |
