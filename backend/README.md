# Flipkart BBD Elastic Scaling — Backend API

**Course:** IT457 Cloud Computing · Group 21  
**Author / Ownership:** Virajkumar Patel (Student ID: 202611047)  
**Runtime:** Node.js 22 LTS  
**Framework:** Express.js 4  
**Database:** PostgreSQL (Supabase) via `pg` connection pool  

---

## 1. Overview & Architecture

The backend provides the core product catalogue API and health/readiness telemetry for the Flipkart Big Billion Days elastic-scaling demonstration. It is designed to run behind an AWS Application Load Balancer (ALB) across an Amazon EC2 Auto Scaling group (ASG) and as a standalone Docker container.

### Key Capabilities
- **Product Catalogue (`/api/products`):** Parameterized SQL queries against Supabase PostgreSQL with category filtering, bounded pagination, and input validation.
- **Dual Health Telemetry:**
  - **Liveness (`/api/health`):** Lightweight, zero-dependency process heartbeat for ALB target group health checks.
  - **Database Readiness (`/api/ready`):** Deep database connectivity check with timeout enforcement; returns HTTP 503 safely if the database is unreachable or slow without exposing connection credentials.
- **Instance Metadata (`/api/instance`):** Safely identifies the responding EC2 instance (via IMDSv2 with 500ms timeout) or local host, demonstrating multi-instance load balancing.
- **ALB-Tuned Connection Lifecycle:** Configured with `keepAliveTimeout = 65000ms` and `headersTimeout = 66000ms` (greater than the default AWS ALB 60s idle timeout) to prevent transient HTTP 502 Bad Gateway errors during keep-alive reuse.
- **Graceful Termination:** Intercepts `SIGTERM` and `SIGINT` to cleanly finish in-flight requests, drain the PostgreSQL pool, and exit within a 10s budget during ASG scale-in.

---

## 2. Supabase & Environment Configuration

All settings are supplied via environment variables. **Never commit credentials or database URLs to Git.**

### Required & Supported Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes (for data) | `null` | Supabase PostgreSQL connection string URI. |
| `SUPABASE_URL` | Alternate | `null` | Legacy fallback name for `DATABASE_URL`. |
| `PORT` | Optional | `5000` | HTTP port on which Express listens. |
| `HOST` | Optional | `0.0.0.0` | Network interface to bind (`0.0.0.0` for all EC2/container interfaces). |
| `CORS_ORIGIN` | Optional | `http://localhost:5173` | Allowed origin for frontend cross-origin requests. |
| `NODE_ENV` | Optional | `development` | Environment mode (`development` or `production`). |
| `DB_READINESS_TIMEOUT_MS`| Optional | `2000` | Maximum time in ms before `/api/ready` fails safely with 503. |
| `INSTANCE_ID` | Optional | auto-detected | Override ID for EC2 instance reporting in tests/demo. |

### Supabase Connection String Note (IPv4 vs IPv6 Pooler)
On Supabase free-tier projects, the direct connection string (`db.<ref>.supabase.co`) only publishes IPv6 `AAAA` records. To ensure compatibility across local ISPs, Docker bridge networks, and EC2 VPC IPv4 routing, use the **Supavisor Connection Pooler (Session mode, port 5432)**:
```text
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

---

## 3. Fresh EC2 Startup Behavior & ALB Integration

When an EC2 Auto Scaling group spins up a new instance from an AMI or UserData script:

1. **Network Interface Binding:**
   The backend binds explicitly to `0.0.0.0:5000` (configurable via `HOST` and `PORT`), making it reachable by the ALB across the VPC private subnet.
2. **Cold-Start Liveness:**
   The Application Load Balancer begins polling `/api/health`. Because `/api/health` does not await external network or database queries, it responds immediately (`200 OK`) as soon as Express is listening, allowing the instance to register as healthy within the ALB healthy threshold window.
3. **Database Readiness (`/api/ready`):**
   The `/api/ready` route queries `SELECT 1` through the connection pool with a bounded timeout (`DB_READINESS_TIMEOUT_MS`). If the connection pool is still initializing, or if network partitions prevent reaching Supabase, the route returns `503 Service Unavailable` with `{ "status": "unavailable", "database": "unavailable" }`. Error messages and internal database connection strings are never leaked.
4. **ALB Connection Reuse:**
   `server.keepAliveTimeout` is set to 65 seconds and `server.headersTimeout` to 66 seconds. This guarantees that the Node.js HTTP server will not close an idle keep-alive socket before the AWS ALB (which defaults to a 60-second idle timeout) initiates a reuse.
5. **Scale-In Lifecycle:**
   When CPU falls below the scaling policy target, the Auto Scaling group sends `SIGTERM` to the instance. The backend stops accepting new HTTP connections, drains active queries from the PostgreSQL pool, and terminates gracefully within 10 seconds.

---

## 4. API Endpoints

### `GET /api/health`
Process heartbeat for load balancer health probes.
- **Response `200 OK`:**
  ```json
  {
    "status": "ok",
    "service": "backend-api",
    "timestamp": "2026-11-11T17:19:31.526Z"
  }
  ```

### `GET /api/ready`
Database connectivity and readiness check.
- **Response `200 OK` (when reachable):**
  ```json
  {
    "status": "ok",
    "database": "reachable"
  }
  ```
- **Response `503 Service Unavailable` (when unconfigured, slow, or offline):**
  ```json
  {
    "status": "unavailable",
    "database": "unavailable"
  }
  ```

### `GET /api/products`
Retrieves the active product catalogue.
- **Query Parameters:**
  - `category` (optional, string): Filter by category name (e.g., `Electronics`, `Fashion`).
  - `limit` (optional, integer, 1–100): Bound the number of products returned.
- **Response `200 OK`:**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Aurora X12 Smartphone",
        "category": "Electronics",
        "description": "Sample 6.5-inch smartphone...",
        "price": 24999.00,
        "image_url": null,
        "stock_quantity": 25,
        "is_active": true,
        "created_at": "2026-11-11T12:00:00.000Z"
      }
    ],
    "meta": {
      "count": 1,
      "limit": 50,
      "category": "Electronics"
    }
  }
  ```

### `GET /api/instance`
Provides safe identity information for demonstrating elastic auto-scaling without exposing IP addresses or VPC infrastructure.

---

## 5. Automated Tests

The test suite runs with Node.js built-in test runner (`node --test`), requiring no heavy test dependencies:

```bash
# Run tests from backend directory
cd backend
npm test

# Or from project root
npm test --prefix backend
```

### Verified Test Scenarios
- `health.test.js`: Health liveness endpoint returns 200 and valid timestamp.
- `readiness.test.js`:
  - Readiness returns 200 and reachable status on successful DB ping.
  - Readiness returns sanitized 503 without leaking credentials on DB failure.
  - Readiness times out safely with 503 when the database is slow.
  - Readiness returns 503 when database is not configured.
- `products.mocked.test.js`: Catalogue queries, category filters, empty tables, and bounded limits.
- `products.validation.test.js`: Input validation (invalid limits, excessive limits, empty strings).
- `products.unconfigured.test.js`: Graceful failure when database credentials are unset.
- `instance.test.js`: IMDSv2 resolution, cached values, and fallback hostnames.
- `compute.test.js`: Worker-thread compute demo and token verification.
- `metrics.test.js`: Request counter and error rate metrics tracking.
- `tls.test.js`: PostgreSQL TLS rejection of insecure modes and verification of CA certs.

---

## 6. Docker Container

Build and run locally:

```bash
# Build Docker image
docker build -t bbd-backend:latest backend/

# Run container binding to port 5000
docker run -d --name bbd-backend -p 5000:5000 \
  -e DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  bbd-backend:latest

# Verify endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/ready
curl http://localhost:5000/api/products
```

---

## 7. AI Assistance Disclosure

In accordance with course academic integrity guidelines:
- Antigravity AI assisted in refining readiness timeout handling, structuring automated tests, configuring ALB keep-alive timeouts, and preparing technical documentation.
- All implementation logic, database schema, and test scenarios were executed, tested, and verified locally on Node.js 24 and Docker 29.
