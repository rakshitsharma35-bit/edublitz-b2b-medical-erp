# Manual Deployment Guide (No Docker/Kubernetes)

Run all 3 backend services and the frontend directly on your local machine.

---

## Prerequisites

| Tool        | Minimum Version | Install                              |
|-------------|-----------------|--------------------------------------|
| Java JDK    | 17              | `brew install openjdk@17`            |
| Maven       | 3.9             | `brew install maven`                 |
| Node.js     | 18              | `brew install node` or nvm           |
| MongoDB     | 7.0             | Local install or MongoDB Atlas free  |

---

## Step 1 — MongoDB Setup

### Option A: Local MongoDB
```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

### Option B: MongoDB Atlas (Recommended)
1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create 3 databases: `users_db`, `products_db`, `orders_db`
3. Create a database user with readWrite access
4. Copy the connection URI

---

## Step 2 — User Service (Port 8081)

```bash
cd user-service

# Copy and configure environment
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT_SECRET

# Build and run
mvn clean package -DskipTests
java -jar target/user-service-1.0.0.jar \
  --MONGODB_URI="mongodb://localhost:27017/users_db" \
  --JWT_SECRET="your-256-bit-hex-secret"
```

**Verify:** `curl http://localhost:8081/api/v1/actuator/health`

**Swagger UI:** http://localhost:8081/api/v1/swagger-ui.html

---

## Step 3 — Product Service (Port 8082)

```bash
cd product-service
mvn clean package -DskipTests
java -jar target/product-service-1.0.0.jar \
  --MONGODB_URI="mongodb://localhost:27017/products_db" \
  --JWT_SECRET="your-256-bit-hex-secret"
```

**Verify:** `curl http://localhost:8082/api/v1/actuator/health`

---

## Step 4 — Order Service (Port 8083)

```bash
cd order-service
mvn clean package -DskipTests
java -jar target/order-service-1.0.0.jar \
  --MONGODB_URI="mongodb://localhost:27017/orders_db" \
  --JWT_SECRET="your-256-bit-hex-secret" \
  --PRODUCT_SERVICE_URL="http://localhost:8082/api/v1" \
  --USER_SERVICE_URL="http://localhost:8081/api/v1"
```

**Verify:** `curl http://localhost:8083/api/v1/actuator/health`

---

## Step 5 — Frontend (Port 5173)

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# .env.local:
# VITE_USER_SERVICE_URL=http://localhost:8081/api/v1
# VITE_PRODUCT_SERVICE_URL=http://localhost:8082/api/v1
# VITE_ORDER_SERVICE_URL=http://localhost:8083/api/v1

# Start dev server
npm run dev
```

**Open:** http://localhost:5173

---

## Step 6 — Bootstrap Data

### Create an Organization (via API)
```bash
# First, create an organization
curl -X POST http://localhost:8081/api/v1/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "City General Hospital",
    "registrationNumber": "HOSP-001",
    "type": "HOSPITAL",
    "address": {"street": "123 Main St","city": "Mumbai","state": "MH","pincode": "400001","country": "India"},
    "contactEmail": "admin@cityhospital.com",
    "contactPhone": "+91-9876543210",
    "active": true
  }'
# Note the returned `id`
```

### Register an Admin User
```bash
curl -X POST http://localhost:8081/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@cityhospital.com",
    "password": "Admin@1234",
    "role": "ADMIN",
    "organizationId": "<org-id-from-above>"
  }'
```

---

## Service URL Summary

| Service         | URL                                      |
|-----------------|------------------------------------------|
| User Service    | http://localhost:8081/api/v1             |
| Product Service | http://localhost:8082/api/v1             |
| Order Service   | http://localhost:8083/api/v1             |
| Frontend        | http://localhost:5173                    |
| User Swagger    | http://localhost:8081/api/v1/swagger-ui.html |
| Product Swagger | http://localhost:8082/api/v1/swagger-ui.html |
| Order Swagger   | http://localhost:8083/api/v1/swagger-ui.html |

---

## Troubleshooting

| Issue                              | Fix                                               |
|------------------------------------|---------------------------------------------------|
| Port already in use                | `lsof -ti:8081 | xargs kill -9`                   |
| MongoDB connection refused         | Check MongoDB is running: `brew services list`    |
| JWT validation fails across svcs   | Ensure JWT_SECRET is identical in all services    |
| Order service can't reach products | Check PRODUCT_SERVICE_URL is correct              |
