# Monitoring API

Express API that supplies the monitoring dashboard with local collector or AWS metrics, scaling events, saved experiments, and bounded demo-test controls.

## Run

Use Node.js 22 or newer. Copy `.env.example` to `.env`, set the required AWS values only for an AWS environment, then run `npm install` and `npm start`.

The service listens on port 5001 by default. `GET /api/health` reports the API process status. Monitoring values are timestamped; missing or stale metrics are reported as unavailable instead of being presented as zero.

## Main routes

- `GET /api/overview`, `/api/history`, and `/api/events` report current and historical observations.
- `GET /api/experiments` and `/api/experiments.csv` return saved measurements.
- `GET /api/test` reports available demo controls. Start/stop requests are bounded and require the project test header.

AWS resources are not created by starting this API. Use the infrastructure instructions to provision a demonstration, and keep the runtime stopped when it is not needed.
