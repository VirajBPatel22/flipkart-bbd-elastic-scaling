# Flipkart Big Billion Days | Elastic Scaling

IT457 Cloud Computing · Group 21

This project demonstrates how a small storefront handles bursts of traffic. A React catalogue uses a Node.js API backed by Supabase PostgreSQL. On AWS, an Application Load Balancer routes requests to an EC2 Auto Scaling group. A separate dashboard shows instance health, latency and CPU, and displays saved load-test results.

## Run locally

Use Docker with the Compose plugin. On Windows, run the commands from WSL if Docker runs there. Clone the repository and open its root directory.

1. Copy [backend/.env.example](backend/.env.example) to backend/.env if you do not already have one. Configure DATABASE_URL using a team-approved PostgreSQL instance. For a new database, follow the [schema and seed instructions](database/README.md).
2. Start the application and inspect its health.

   ~~~bash
   docker compose up --build -d
   docker compose ps
   ~~~

3. Open the [storefront](http://localhost:8081/) and [monitoring dashboard](http://localhost:8081/dashboard/). The [readiness endpoint](http://localhost:8081/api/ready) checks the database connection.

For development without Compose, see [local development](docs/LOCAL_DEVELOPMENT.md). For automated checks, use Node.js 22 and run:

~~~bash
npm run install:all
npm test --prefix backend
npm test --prefix dashboard/monitoring-api
npm run build:frontend
npm run build:dashboard-frontend
~~~

## Results

| AWS experiment | Observation |
| --- | --- |
| Fixed capacity, 4 requests/s | One backend: 96/120 successful, p95 698.14 ms. Two backends: 120/120 successful, p95 397.65 ms. |
| Controlled CPU load | CPU policy drove the group from one healthy backend to two and back to one. [Evidence](docs/evidence/2026-11-09-automatic-scaling/README.md) |
| HTTP overload, 5 requests/s | The CPU alarm triggered a second instance launch. Of 2,098 completed requests, 1,422 failed. The second target became healthy after the run. |

The fixed-capacity comparison used one short run per configuration. Read the [load-testing guide](docs/LOAD_TESTING.md) for the workload and measurement limits.

## AWS demonstration

The team provisions AWS for scheduled demonstrations and removes the runtime afterwards to control costs. The address changes on redeployment. Follow the [AWS setup](docs/AWS_MANUAL_SETUP.md) and [restart and shutdown notes](docs/AWS_PAUSE_RESTART.md). The local dashboard and AWS deployment use separate metrics sources.

## Repository map

| Directory | Contents |
| --- | --- |
| [frontend/](frontend/) | React storefront and catalogue images |
| [backend/](backend/) | Express API, worker-based compute endpoint and tests |
| [dashboard/](dashboard/) | React monitoring UI and its metrics API |
| [database/](database/) | PostgreSQL migration and sample catalogue |
| [infrastructure/](infrastructure/) | Terraform, AWS bootstrap, Docker gateway and scripts |
| [load-tests/](load-tests/) | k6 workloads, experiment runners and result summaries |
| [docs/](docs/) | Runbooks, design references and recorded evidence |

## Group 21

| Member | Student ID | Responsibility |
| --- | --- | --- |
| Om Patel | 202611030 | AWS deployment, scaling tests, monitoring dashboard and performance evidence |
| Neel Prajapati | 202611022 | React storefront, API integration, product views and loading and error states |
| Virajkumar Patel | 202611047 | Node.js and Express API, Supabase catalogue, health checks and EC2 startup readiness |

[Project documentation](docs/README.md) indexes the setup guides, research and recorded results. The team's next implementation milestones are listed in the [work schedule](docs/WORK_SCHEDULE.md).
