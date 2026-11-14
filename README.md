# Flipkart Big Billion Days Elastic Scaling

IT457 Cloud Computing · Group 21

A classroom project demonstrating a React storefront, Node.js and Supabase API, AWS Application Load Balancer and EC2 Auto Scaling, and a monitoring dashboard with bounded load-test scenarios.

## Run locally

Use Node.js 22 and Docker Compose. Configure `backend/.env` with the team-approved database connection, then run:

~~~bash
docker compose up --build -d
docker compose ps
~~~

Open `http://localhost:8081/` for the storefront and `http://localhost:8081/dashboard/` for monitoring. See [local development](docs/LOCAL_DEVELOPMENT.md) and [load testing](docs/LOAD_TESTING.md) for details.

## Project areas

- `frontend/` — React storefront
- `backend/` and `database/` — Express API and Supabase schema
- `dashboard/` — monitoring API and dashboard
- `infrastructure/` — Terraform, EC2 bootstrap, gateway and verification scripts
- `load-tests/` — bounded k6 scenarios and experiment runners
- `docs/` — setup, measurement definitions and recorded evidence

## Group 21

| Member | Student ID | Responsibility |
| --- | --- | --- |
| Om Patel | 202611030 | AWS deployment, scaling tests, monitoring dashboard and performance evidence |
| Neel Prajapati | 202611022 | React storefront, API integration, product views and loading/error states |
| Virajkumar Patel | 202611047 | Node.js/Express API, Supabase catalogue, health checks and EC2 readiness |

AWS resources are kept paused outside scheduled demonstrations to control cost. Follow the [AWS runbook](docs/AWS_MANUAL_SETUP.md) and [pause/restart guide](docs/AWS_PAUSE_RESTART.md); do not assume a live URL is available.
