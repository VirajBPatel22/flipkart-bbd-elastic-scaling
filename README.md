# Flipkart Big Billion Days — Elastic Scaling and Live AWS Monitoring

> **IT457 Cloud Computing | Elastic Scaling & Live Monitoring Proof of Concept**

## Project Objective

A small cloud proof of concept inspired by Flipkart's Big Billion Days flash
sale, demonstrating:

- AWS load balancing across multiple backend instances.
- CPU target tracking with configurable backend capacity (1–3; quota-safe demo 1–2).
- Live infrastructure monitoring via a dedicated dashboard.
- Performance measurement (response time vs. backend instance count).

## Technology Stack

For domain-free AWS deployment use [ALB demo setup](docs/ALB_DEMO_SETUP.md).
For live CPU policy verification use [automatic scaling verification](docs/AUTO_SCALING_VERIFICATION.md).
The SSM CPU test proves policy reactions separately from HTTP performance tests.

| Layer | Technology |
|---|---|
| Frontend | React.js (JavaScript) + Vite |
| Backend | Node.js + Express.js |
| Database | Supabase (PostgreSQL) |
| Cloud | AWS EC2, Application Load Balancer, Auto Scaling Group, IAM, CloudWatch |
| Load testing | k6 |
| Infrastructure as Code | Terraform |

## Current local implementation

Storefront and existing Supabase-backed API are preserved. Docker Compose now
provides a loopback gateway on **http://localhost:8081**, manual backend scaling
from 1–3 replicas, a real local monitoring dashboard, and controlled k6 experiments
with persistent JSON/CSV summaries. AWS deployment code and its monitoring adapter are implemented locally; live deployment remains manual.
See [verification report](docs/LOCAL_VERIFICATION.md) for actual test evidence and
limitations, [Docker setup](docs/DOCKER_SETUP.md), [monitoring](docs/MONITORING_DASHBOARD.md),
[load testing](docs/LOAD_TESTING.md), and [AWS readiness](docs/AWS_DEPLOYMENT_READINESS.md).

```bash
cd /mnt/c/Users/okpat/Desktop/flipkart-bbd-elastic-scaling
docker compose up --build -d
# Open http://localhost:8081/ and http://localhost:8081/dashboard/
```

> **Note on project history:** Earlier planning research for this project
> (case study analysis, hybrid-cloud theory, cost/TCO modeling, AWS Academy
> Learner Lab constraints, etc.) is preserved in `docs/00` through `docs/10`
> and in `masterplan.md`. That earlier plan explored a Python/FastAPI
> implementation; the project has since settled on the fixed
> React + Node.js/Express + Supabase stack described above, which is what
> this README and the `frontend/`, `backend/`, and `dashboard/` folders
> implement going forward. The research documents remain useful background
> reading (especially the Learner Lab budget/timeout rules and the cost
> model) and are not stack-specific.

## Folder Structure

```
flipkart-bbd-elastic-scaling/
├── frontend/                  React + Vite storefront, fetches real products from the backend API
├── backend/                   Node.js + Express API for the storefront (products, health, identity and protected compute)
├── dashboard/
│   ├── frontend/               React + Vite monitoring dashboard UI with real local metrics
│   └── monitoring-api/         Node.js + Express API that will query live AWS data (products, health, identity and protected compute)
├── database/                  Supabase schema: products table, RLS policy, sample seed data
├── load-tests/                k6 load-test scenarios and results — not created yet
├── infrastructure/
│   ├── terraform/               AWS infrastructure definitions and offline tests
│   └── scripts/                 Validation and manual AWS setup helpers
├── docs/                       Project documentation and prior research
├── masterplan.md               Earlier detailed project plan (see note above)
├── .env.example                 Index of per-component env files
└── package.json                 Root convenience scripts
```

## Prerequisites

- Node.js 18+ (developed with Node.js 22)
- npm 10+
- Git

## Installation

```bash
git clone https://github.com/VirajBPatel22/flipkart-bbd-elastic-scaling.git
cd flipkart-bbd-elastic-scaling
npm run install:all
```

This installs dependencies for the root, `frontend`, `backend`,
`dashboard/frontend`, and `dashboard/monitoring-api`. See `docs/setup.md`
for the manual per-component steps and environment variable setup.

To get real data out of `GET /api/products`, also follow
`database/README.md` to create a Supabase project, run the migration/seed
SQL, and set `DATABASE_URL` in `backend/.env`.

## Running Locally

| Component | Command | URL |
|---|---|---|
| Frontend | `npm run dev:frontend` | http://localhost:5173 |
| Backend | `npm run dev:backend` | http://localhost:5000/api/health |
| Dashboard frontend | `npm run dev:dashboard-frontend` | http://localhost:5174 |
| Monitoring API | `npm run dev:dashboard-api` | http://localhost:5001/api/health |

## AWS next steps
Follow [the manual AWS runbook](docs/AWS_MANUAL_SETUP.md) after reviewing
[completion status](docs/COMPLETION_STATUS.md).
## Historical roadmap

1. ~~**Database** — Design and apply the Supabase schema; connect the backend.~~ ✅
2. ~~**Storefront** — Build the product listing UI consuming `GET /api/products`.~~ ✅ (cart/checkout still pending)
3. **Infrastructure** — Write Terraform for VPC, ALB, Target Group, Launch
   Template, and Auto Scaling Group (min 1, max 3 instances).
4. **IAM & Monitoring** — Create a least-privilege IAM role and implement
   real AWS calls (EC2, Auto Scaling, ELB, CloudWatch) in the monitoring API.
5. **Load Testing** — Write k6 scenarios and measure response time at 1, 2,
   and 3 backend instances.
6. **Performance Report** — Summarize latency vs. instance count and
   scaling behavior observed during load tests.

## Team

| Member | Role | GitHub |
|:---|:---|:---|
| Viraj Patel | Infrastructure & CloudOps Lead | [@VirajBPatel22](https://github.com/VirajBPatel22) |
| Neel Prajapati | Application & Load Testing Lead | @member-b |
| Om Patel | Research, Cost & Documentation Lead | @member-c |

## References

See `docs/00-sources-index.md` for the annotated bibliography compiled during
project research.
