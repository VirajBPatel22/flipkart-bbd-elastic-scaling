# Monitoring API

Express API for the Group 21 monitoring dashboard. This service owns the `/api` routes used to report service health, current overview, metric history, scaling events, and saved experiments.

## Run

Use Node.js 22 or newer.

~~~bash
cp .env.example .env
npm install
npm run dev
~~~

The API listens on `0.0.0.0:5001` by default. `GET /api/health` is a liveness check for the monitoring API itself. It does not claim that AWS or a metrics source is available.

## Routes

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Monitoring API liveness and current UTC timestamp |
| `GET /api/overview` | Current service and capacity overview |
| `GET /api/history` | Time-series samples for dashboard charts |
| `GET /api/events` | Scaling activity records |
| `GET /api/experiments` | Saved load-test measurements |
| `GET /api/experiments.csv` | CSV export of saved measurements |

Until a data provider is connected, the overview reports `source: "unavailable"`, numeric measurements are `null`, and collection routes return empty arrays. Those responses mean no measurement is available; they are not zero-valued measurements.

Set `CORS_ORIGINS` to a comma-separated list of development origins when the dashboard runs on a separate local port. Requests without an `Origin` header, such as same-origin gateway traffic and health checks, are accepted.
