> For the current integrated WSL2 Docker system, use [DOCKER_SETUP.md](DOCKER_SETUP.md),
> [LOAD_TESTING.md](LOAD_TESTING.md) and [MONITORING_DASHBOARD.md](MONITORING_DASHBOARD.md).
> The component-by-component Windows guide below is historical; its old Compose
> ports, placeholder monitoring descriptions, and default demo token are superseded.
> Preserve existing backend/.env; do not copy templates over configured secrets.

# Local Development and Verification Guide

**Project:** Flipkart Big Billion Days — Elastic Scaling
**Repository:** `flipkart-bbd-elastic-scaling`
**Target Environment:** Windows 10/11, PowerShell, Visual Studio Code

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Prerequisites & System Verification](#2-prerequisites--system-verification)
3. [Initial Project Installation](#3-initial-project-installation)
4. [Environment Configuration](#4-environment-configuration)
5. [Database Setup (Supabase PostgreSQL)](#5-database-setup-supabase-postgresql)
6. [Starting the Applications](#6-starting-the-applications)
   - [Option A: Component-by-Component (Recommended for Debugging)](#option-a-component-by-component-separate-terminals)
   - [Option B: Root-Level Convenience Scripts](#option-b-root-level-convenience-scripts)
7. [Step-by-Step Verification](#7-step-by-step-verification)
   - [Automated Test Suite](#1-automated-backend-unit--mock-tests)
   - [Storefront & Database API](#2-verify-backend-catalogue-endpoints)
   - [Server Identity Endpoint (GET /api/instance)](#3-verify-server-identity-endpoint-get-apiinstance)
   - [Controlled CPU Workload (POST /api/demo/compute)](#4-verify-controlled-cpu-workload-post-apidemocompute)
   - [Monitoring API & Dashboard](#5-verify-monitoring-api--dashboard)
8. [Docker Packaging & Local Container Execution](#8-docker-packaging--local-container-execution)
9. [Stopping All Services](#9-stopping-all-services)
10. [Known Limitations & Troubleshooting](#10-known-limitations--troubleshooting)

---

## 1. Overview & Architecture

This project is an elastic scaling demonstration simulating peak e-commerce traffic during Flipkart's Big Billion Days. The repository is organized into four decoupled applications designed for high horizontal scalability:

```text
flipkart-bbd-elastic-scaling/
│
├── frontend/                     # Customer-facing storefront (React 19 + Vite)
│   ├── src/                      # UI components, product grid, search, status badges
│   └── vite.config.js            # Default Vite port: 5173
│
├── backend/                      # Production-ready Catalogue API (Node.js + Express)
│   ├── Dockerfile                # Production container packaging (node:22-alpine)
│   ├── .dockerignore             # Prevents secrets, tests, node_modules from leaking
│   ├── src/
│   │   ├── config/               # db connection pool, timeouts, environment config
│   │   ├── controllers/          # health, products, instance, compute controllers
│   │   ├── routes/               # Express route registrations
│   │   ├── services/             # SQL queries, IMDSv2 metadata lookup, compute service
│   │   ├── workers/              # worker_threads for non-blocking CPU workloads
│   │   └── server.js             # Graceful shutdown, ALB-compatible keepAlive timeouts
│   └── tests/                    # Native Node.js test suite (node --test)
│
├── dashboard/
│   ├── frontend/                 # System monitoring UI (React 19 + Vite)
│   │   └── vite.config.js        # Configured Vite port: 5174 (Placeholder UI)
│   │
│   └── monitoring-api/           # Health & metrics API (Node.js + Express)
│       └── src/                  # Express server on port 5001 (Placeholder API)
│
├── database/
│   ├── migrations/               # Schema definitions (0001_create_products_table.sql)
│   └── seeds/                    # Mock catalogue data (0001_sample_products.sql)
│
├── docs/                         # Architecture, guides, and project documentation
├── package.json                  # Root orchestration & convenience scripts
└── README.md
```

### Component Port Mapping

| Component | Technology | Default Port | Default Health / Access URL |
|---|---|---|---|
| **Backend API** | Node.js / Express (`pg` pool) | `5000` | `http://localhost:5000/api/health` |
| **Storefront Frontend** | React 19 / Vite | `5173` | `http://localhost:5173` |
| **Monitoring API** | Node.js / Express | `5001` | `http://localhost:5001/api/health` |
| **Monitoring Dashboard** | React 19 / Vite | `5174` | `http://localhost:5174` |
| **Database** | Supabase PostgreSQL | `5432` (Remote) | Direct connection via `DATABASE_URL` |

---

## 2. Prerequisites & System Verification

Before running this project on Windows, verify that the required runtimes and tools are installed:

### Required Software
1. **Node.js**: `v18.0.0` or higher (The project packages specify `"engines": { "node": ">=18" }`; developed and tested with Node.js `v22`).
2. **npm**: `v10.0.0` or higher (bundled with Node.js 18+).
3. **Git**: Used for version control.
4. **Visual Studio Code**: Recommended editor for terminal split management.
5. **Docker Desktop** *(Optional for local container testing)*: Required to build and run the backend Docker image locally.

### Verification Commands

Open a Windows PowerShell terminal and run:

```powershell
node --version
npm --version
git --version
docker --version
```

**Expected output:**
- `node`: `v18.x.x` or `v20.x.x` or `v22.x.x`
- `npm`: `9.x.x` or `10.x.x`
- `git`: `git version 2.x.x`
- `docker`: `Docker version 20.x+` (if Docker Desktop is installed)

---

## 3. Initial Project Installation

Install all required dependencies across the root repository and the four sub-projects.

### Method 1: All-in-One Root Script (Recommended)

From the root directory (`flipkart-bbd-elastic-scaling`):

```powershell
npm run install:all
```

This triggers:
```powershell
npm install && npm --prefix frontend install && npm --prefix backend install && npm --prefix dashboard/frontend install && npm --prefix dashboard/monitoring-api install
```

### Method 2: Manual Component-by-Component Installation

If you prefer to install dependencies individually:

```powershell
# Root workspace
npm install

# Backend API
cd backend
npm install
cd ..

# Frontend Storefront
cd frontend
npm install
cd ..

# Monitoring Dashboard Frontend
cd dashboard/frontend
npm install
cd ../..

# Monitoring API
cd dashboard/monitoring-api
npm install
cd ../..
```

---

## 4. Environment Configuration

Every application has a template `.env.example` file. You must copy each file to `.env` in its respective directory.

> [!IMPORTANT]
> - `.env` files contain local secrets and private configurations. They are included in `.gitignore` and **must never be committed to Git**.
> - Variables prefixed with `VITE_` in frontend directories are bundled directly into client-side browser JavaScript. **Never put database passwords, AWS secret keys, or Supabase service-role keys in frontend `.env` files.**

### Generate `.env` Files via PowerShell

Run these commands from the root repository directory:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
Copy-Item dashboard/frontend/.env.example dashboard/frontend/.env
Copy-Item dashboard/monitoring-api/.env.example dashboard/monitoring-api/.env
```

---

### Environment Variable Reference

#### 1. Backend API (`backend/.env`)

| Variable | Default / Example Value | Description |
|---|---|---|
| `PORT` | `5000` | Port Express listens on. Automatically overridden in cloud environments. |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed origin for frontend requests. |
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` | Direct PostgreSQL URI connection string to Supabase. |
| `ENABLE_DEMO_COMPUTE` | `true` | Enables or disables the `POST /api/demo/compute` endpoint. |
| `LOAD_TEST_TOKEN` | `bbd-load-test-token-2026` | Secret authentication token required to trigger CPU compute workloads. |
| `MAX_CONCURRENT_COMPUTE_JOBS` | `2` | Bounded concurrency cap for active CPU worker threads. |
| `INSTANCE_ID` | *(Empty)* | Optional manual override for server identity. When omitted, uses IMDSv2 on AWS EC2 or falls back to `local-<hostname>`. |

> [!NOTE]
> `SUPABASE_URL` is also accepted as a fallback if you previously stored your `postgresql://` connection string under that variable name. `DATABASE_URL` takes precedence if both are set.

#### 2. Frontend Storefront (`frontend/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000` | The base URL of the backend Express API. |
| `VITE_DASHBOARD_URL` | `http://localhost:5174` | Address linking to the monitoring dashboard interface. |

#### 3. Monitoring Dashboard Frontend (`dashboard/frontend/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `VITE_MONITORING_API_BASE_URL` | `http://localhost:5001` | The base URL of the monitoring Express API. |

#### 4. Monitoring API (`dashboard/monitoring-api/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5001` | The port the monitoring Express server listens on. |
| `CORS_ORIGIN` | `http://localhost:5174` | Allowed origin for dashboard frontend requests. |

*(Note: The monitoring API is currently a local placeholder service and does not require AWS credentials).*

---

## 5. Database Setup (Supabase PostgreSQL)

The backend connects directly to PostgreSQL using the `pg` client library (connection pool) rather than the HTTP-based Supabase JavaScript client.

### Step 1: Obtain Your Database Connection String

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. Click **Project Settings** (gear icon in sidebar) -> **Database**.
4. Scroll down to **Connection string** and select the **URI** tab.
5. Select **Session pooler** (port `5432`) — **Recommended** (supports dual-stack IPv4/IPv6):
   ```text
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```
   *(Note: The Direct connection `db.<ref>.supabase.co:5432` only publishes IPv6 DNS records on free tiers, which leads to `getaddrinfo ENOTFOUND` errors on networks without active IPv6 routing. Using the Session pooler ensures full IPv4 compatibility across all environments).*
6. Replace `[YOUR-PASSWORD]` with the database password set during project creation.
7. Open `backend/.env` in VS Code and paste the string:
   ```env
   DATABASE_URL=postgresql://postgres.your-project-ref:YourActualPassword@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```

> [!WARNING]
> Because this direct connection authenticates as the `postgres` superuser, it bypasses Supabase Row Level Security (RLS). Read-only safety is strictly enforced by application query logic (`WHERE is_active = true`) in `backend/src/services/products.service.js`. Keep this connection string secret.

### Step 2: Run Database Migrations and Seeds

Both scripts are standard PostgreSQL SQL scripts located in `database/`:

1. In Supabase Dashboard, click **SQL Editor** on the left menu.
2. Click **New query**.
3. Open `database/migrations/0001_create_products_table.sql`, paste the full contents into the editor, and click **Run**.
4. Click **New query** again.
5. Open `database/seeds/0001_sample_products.sql`, paste the full contents into the editor, and click **Run**.
6. Verify the table by running:
   ```sql
   SELECT count(*) FROM public.products;
   ```
   You should see 12 sample products returned.

---

## 6. Starting the Applications

The project consists of 4 processes. The backend services must remain running while interacting with the frontends.

### Option A: Component-by-Component (Separate Terminals)

Open Visual Studio Code and use terminal splits (`Ctrl + Shift + \`` or `Terminal` -> `New Terminal`) to create 4 PowerShell splits.

#### Terminal 1: Backend API
```powershell
cd backend
npm run dev
```
- **Process:** Express API with Node watch mode (`node --watch src/server.js`)
- **Expected Console Output:**
  ```text
  Backend API listening on port 5000
  ```
- **Health Verification URL:** `http://localhost:5000/api/health`

---

#### Terminal 2: Storefront Frontend
```powershell
cd frontend
npm run dev
```
- **Process:** Vite development server
- **Expected Console Output:**
  ```text
  VITE v8.x.x  ready in ... ms

  ➜  Local:   http://localhost:5173/
  ```
- **Application URL:** `http://localhost:5173`

---

#### Terminal 3: Monitoring API
```powershell
cd dashboard/monitoring-api
npm run dev
```
- **Process:** Express Monitoring API with Node watch mode (`node --watch src/server.js`)
- **Expected Console Output:**
  ```text
  Monitoring API listening on port 5001
  ```
- **Health Verification URL:** `http://localhost:5001/api/health`

---

#### Terminal 4: Monitoring Dashboard Frontend
```powershell
cd dashboard/frontend
npm run dev
```
- **Process:** Vite development server (port 5174)
- **Application URL:** `http://localhost:5174`

---

### Option B: Root-Level Convenience Scripts

Open 4 separate PowerShell terminals at the repository root `flipkart-bbd-elastic-scaling`:

```powershell
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Storefront
npm run dev:frontend

# Terminal 3: Monitoring API
npm run dev:dashboard-api

# Terminal 4: Monitoring Dashboard
npm run dev:dashboard-frontend
```

---

## 7. Step-by-Step Verification

### 1. Automated Backend Unit & Mock Tests
The backend includes automated tests using Node's native test runner (`node:test`) covering health, product filtering, validation, identity, and worker-thread compute endpoints:

```powershell
cd backend
npm test
```
**Expected outcome:** All 14 tests pass.

---

### 2. Verify Backend Catalogue Endpoints

Test endpoints using PowerShell `curl.exe` or your browser:

#### Health Check:
```powershell
curl.exe http://localhost:5000/api/health
```
**Expected Response:**
```json
{"status":"ok","service":"backend-api","timestamp":"2026-..."}
```

#### Full Product Catalogue:
```powershell
curl.exe http://localhost:5000/api/products
```
**Expected Response:**
A JSON payload containing `data` with 12 active products and `meta: { count: 12 }`.

#### Query Parameters (Limit & Category):
```powershell
# Limit result count
curl.exe "http://localhost:5000/api/products?limit=3"

# Filter by category
curl.exe "http://localhost:5000/api/products?category=Electronics"

# Non-existent category (returns empty array, HTTP 200)
curl.exe "http://localhost:5000/api/products?category=NonExistent"
```

#### Query Validation (HTTP 400):
```powershell
# Invalid limit
curl.exe "http://localhost:5000/api/products?limit=abc"

# Excessive limit (>100)
curl.exe "http://localhost:5000/api/products?limit=200"
```

---

### 3. Verify Server Identity Endpoint (`GET /api/instance`)

This endpoint allows the frontend or load balancer verification tools to identify which specific server instance responded to a request:

```powershell
curl.exe http://localhost:5000/api/instance
```

**Expected Response:**
```json
{
  "status": "ok",
  "instanceId": "local-YOUR-COMPUTER-NAME",
  "hostname": "YOUR-COMPUTER-NAME",
  "platform": "win32",
  "nodeVersion": "v22.x.x",
  "environment": "development",
  "uptimeSeconds": 142,
  "timestamp": "2026-..."
}
```

> [!NOTE]
> On AWS EC2, this endpoint automatically queries the EC2 IMDSv2 metadata service (`http://169.254.169.254/latest/meta-data/instance-id`) to return the real AWS instance ID (e.g. `i-0123456789abcdef0`). In local or Docker environments where IMDSv2 is unreachable, it safely falls back to the local hostname within 500ms and caches the result.

---

### 4. Verify Controlled CPU Workload (`POST /api/demo/compute`)

The `/api/demo/compute` endpoint generates controlled CPU consumption using Node.js `worker_threads`. It is designed for future AWS Auto Scaling load testing without blocking the event loop or causing `/api/health` probes to fail.

#### Authentication Requirement:
Requests require the `x-load-test-token` header (or `Authorization: Bearer <token>`).

#### Unauthorized Request (HTTP 401):
```powershell
curl.exe -X POST http://localhost:5000/api/demo/compute -H "Content-Type: application/json" -d '{\"iterations\": 50000}'
```

#### Successful Compute Execution:
```powershell
curl.exe -X POST http://localhost:5000/api/demo/compute `
  -H "Content-Type: application/json" `
  -H "x-load-test-token: bbd-load-test-token-2026" `
  -d '{"iterations": 100000}'
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Compute workload completed successfully",
  "workload": {
    "iterations": 100000
  },
  "durationMs": 35,
  "digestSample": "a4f89c1b...",
  "activeJobsSnapshot": 1,
  "instanceId": "local-YOUR-COMPUTER-NAME"
}
```

#### Parameter Bounds:
- `iterations`: Integer between `10,000` and `5,000,000` (values outside this range return HTTP 400).
- Alternatively: `{"workload": 50}` (integer scale 1–100, mapped to `workload * 50,000` iterations).
- Max concurrent jobs: 2 concurrent worker threads (excess requests immediately receive HTTP 429).
- Timeout protection: Any job exceeding 5000ms is terminated and returns HTTP 504.

---

### 5. Verify Monitoring API & Dashboard

1. **Monitoring API Health:**
   ```powershell
   curl.exe http://localhost:5001/api/health
   ```
   Returns `{"status":"ok","service":"monitoring-api",...}`.

2. **Monitoring Dashboard UI:**
   Navigate to `http://localhost:5174`. The page renders the placeholder banner indicating that live CloudWatch and Auto Scaling Group metrics will be connected in the subsequent cloud phase.

---

## 8. Docker Packaging & Local Container Execution

The backend includes a production-grade Dockerfile based on `node:22-alpine` that runs as a non-root user and installs only production dependencies.

### Inspecting Docker Availability

Check if Docker is installed and the daemon is active:

```powershell
docker --version
docker ps
```

If Docker Desktop is running, proceed with the build and run commands below. If Docker Desktop is not yet installed or running, install it from [docker.com](https://www.docker.com/products/docker-desktop/) and start the daemon before executing these steps.

### Step 1: Build the Backend Docker Image

From the repository root:

```powershell
docker build -t flipkart-bbd-backend -f backend/Dockerfile backend/
```

### Step 2: Run the Backend Container Locally

Pass the configuration and Supabase connection string at runtime via environment variables (never baked into the image):

```powershell
docker run -d `
  --name bbd-backend-local `
  -p 5000:5000 `
  -e PORT=5000 `
  -e DATABASE_URL="postgresql://postgres:YourPassword@db.your-ref.supabase.co:5432/postgres" `
  -e CORS_ORIGIN="http://localhost:5173" `
  -e LOAD_TEST_TOKEN="bbd-load-test-token-2026" `
  flipkart-bbd-backend
```

### Step 3: Verify the Running Container

```powershell
# Check container status
docker ps

# Check container logs
docker logs bbd-backend-local

# Verify container health endpoint
curl.exe http://localhost:5000/api/health

# Verify product catalogue from inside container
curl.exe http://localhost:5000/api/products

# Verify instance identity
curl.exe http://localhost:5000/api/instance
```

### Step 4: Stop and Remove Container

```powershell
docker stop bbd-backend-local
docker rm bbd-backend-local
```

---

## 9. Stopping All Services

### Standard Termination
Click into each active terminal window running a service and press `Ctrl + C`. When prompted with `Terminate batch job (Y/N)?`, type `Y` and press `Enter`.

### Force-Stopping Stale Ports (PowerShell)

If a Node process is left running in the background holding port `5000` or `5001`:

```powershell
# Identify process holding port 5000
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object OwningProcess, LocalPort, State

# Stop process by PID (replace 1234 with the actual OwningProcess ID)
Stop-Process -Id 1234 -Force
```

---

## 10. Known Limitations & Troubleshooting

1. **Docker Daemon Availability on Windows**:
   - The repository provides a tested, multi-stage production `backend/Dockerfile` and `.dockerignore`. Running `docker build` requires Docker Desktop with the WSL2 backend running. If the daemon is stopped, start Docker Desktop before building.
2. **Supabase Direct Connection Timeouts / `getaddrinfo ENOTFOUND`**:
   - The backend sets `connectionTimeoutMillis: 10000` and `ssl: { rejectUnauthorized: false }`.
   - If you see `getaddrinfo ENOTFOUND db.<ref>.supabase.co`, your local network does not route IPv6 (Supabase direct connection uses IPv6 AAAA records on free tiers).
   - Solution: Switch to the Supabase **Session pooler** URI (`aws-0-[region].pooler.supabase.com:5432`) which provides dual-stack IPv4/IPv6 support.
3. **Stateless Architecture**:
   - The backend stores zero session state or local files. Multiple container instances can run concurrently behind an AWS Application Load Balancer without session synchronization issues.
4. **Monitoring Dashboard**:
   - The monitoring dashboard frontend (`:5174`) and monitoring API (`:5001`) are intentional development placeholders. They do not display synthetic AWS data and will be connected to real CloudWatch and Auto Scaling APIs in the upcoming cloud deployment phase.
