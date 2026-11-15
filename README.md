# Flipkart Big Billion Days Elastic Scaling

**IT457 Cloud Computing · Group 21**

This project is a small e-commerce demonstration for studying how an application can respond to sudden increases in traffic. It combines a React storefront, a Node.js API, a monitoring dashboard, and AWS infrastructure that can scale the backend. The product catalogue is fictional; this project is not part of Flipkart's production platform.

## Project overview

- **Storefront:** React and Vite interface for browsing fictional products.
- **Backend:** Node.js and Express API connected to Supabase PostgreSQL.
- **Monitoring:** Dashboard and API for application metrics, experiment summaries, and AWS instance health.
- **Cloud infrastructure:** Terraform configuration for an Application Load Balancer, EC2 Auto Scaling, CloudWatch, and Systems Manager.
- **Experiments:** Bounded k6 tests for comparing fixed backend capacity, plus a CPU-driven Auto Scaling demonstration.

The final report describes the measured results and their limitations. Supporting experiment files are available in [the final evidence archive](docs/evidence/final-submission-2026-11/README.md). In the recorded CPU experiment, the backend scaled from one instance to two healthy instances and then returned to one. This experiment demonstrates CPU-triggered scaling; it does not by itself establish improved HTTP performance.

## Run locally

Requirements: Node.js 22 and Docker Compose. Create `backend/.env` from [`backend/.env.example`](backend/.env.example) and add the database settings required for product queries. Keep real credentials in local environment files; do not commit them.

```bash
docker compose up --build -d
docker compose ps
```

Open the storefront at `http://localhost:8081/` and the monitoring dashboard at `http://localhost:8081/dashboard/`. See [Local Development](docs/LOCAL_DEVELOPMENT.md) for service details and troubleshooting. See [Load Testing](docs/LOAD_TESTING.md) for the bounded local experiment procedure.

## Reports

The reports document the project from initial research through implementation and results.

| Stage | Report |
| --- | --- |
| Week 1 research and project scope | [IT457 Week 1 Group 21 Report](docs/reports/IT457_Week1_Group21_Report.pdf) |
| Week 2 research and proposed design | [IT457 Week 2 Report](docs/reports/IT457_Week2_Report.pdf) |
| Final implementation and experiment results | [IT457 Group 21 Final Report](docs/reports/IT457_Group21_Final_Report.pdf) |

## Team

| Member | Student ID | Project area |
| --- | --- | --- |
| Om Patel | 202611030 | AWS deployment, scaling experiments, and monitoring |
| Neel Prajapati | 202611022 | React storefront and product interface |
| Virajkumar Patel | 202611047 | Node.js API, Supabase integration, and backend readiness |

## Repository layout

```text
backend/          Express API and database access
dashboard/        Monitoring API and React dashboard
database/         Database schema and setup
docs/             Setup guides, project evidence, and reports
frontend/         React storefront
infrastructure/   Terraform, container support, and AWS scripts
load-tests/       k6 scenarios and experiment runners
```

Cloud resources are paused outside demonstration periods to control cost, so a live AWS URL may not be available at all times.
