# Local Setup

## Prerequisites

- Node.js 18+ (developed with Node.js 22)
- npm 10+
- Git

## Install dependencies

From the repository root:

```bash
npm run install:all
```

This installs the root dependencies plus each component's dependencies
(`frontend`, `backend`, `dashboard/frontend`, `dashboard/monitoring-api`).

Alternatively, install each component individually:

```bash
cd frontend && npm install
cd backend && npm install
cd dashboard/frontend && npm install
cd dashboard/monitoring-api && npm install
```

## Environment variables

Each component has its own `.env.example` file. Copy it to `.env` in the
same folder and adjust values as needed:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
cp dashboard/frontend/.env.example dashboard/frontend/.env
cp dashboard/monitoring-api/.env.example dashboard/monitoring-api/.env
```

`.env` files are git-ignored and must never be committed.

As of this phase, `backend/.env` also needs a real `DATABASE_URL`
(the Supabase Postgres **connection string**, not a REST API key) for
`GET /api/products` to return real data. See `database/README.md` for how
to create the Supabase project, run the schema/seed SQL, and find this
value. Without it, the backend still starts and `/api/health` still works,
but `/api/products` responds with a clear configuration error (HTTP 500)
instead of fabricating product data.

## Running locally

| Component | Command | URL |
|---|---|---|
| Frontend | `npm run dev:frontend` (from root) or `cd frontend && npm run dev` | http://localhost:5173 |
| Backend | `npm run dev:backend` (from root) or `cd backend && npm run dev` | http://localhost:5000/api/health |
| Dashboard frontend | `npm run dev:dashboard-frontend` (from root) or `cd dashboard/frontend && npm run dev` | http://localhost:5174 |
| Monitoring API | `npm run dev:dashboard-api` (from root) or `cd dashboard/monitoring-api && npm run dev` | http://localhost:5001/api/health |

## Checking the backend API

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/products
curl "http://localhost:5000/api/products?category=Electronics"
curl "http://localhost:5000/api/products?limit=3"
```

## Running backend tests

```bash
cd backend
npm test
```

Uses Node's built-in test runner. These tests use a mocked `pg` Pool and
do not require real credentials — see `backend/tests/README.md` for what
each test covers and how to manually verify the real database integration.

## Using the storefront

With the backend running (`npm run dev:backend`) and the frontend running
(`npm run dev:frontend`), open http://localhost:5173.

- Without `backend/.env` configured (no `DATABASE_URL`), the product grid
  will show the error state with a **Retry** button — this is expected and
  correct behavior, not a bug. The small API status indicator in the header
  will still show "Backend online" because `/api/health` does not depend
  on the database.
- Once `backend/.env` has a real `DATABASE_URL` and the schema/seed SQL has
  been run (see `database/README.md`), reload the page to see the real
  seeded products, working category filters, and the client-side search box.
- `frontend/.env` controls `VITE_API_BASE_URL` (which backend to call) and
  `VITE_DASHBOARD_URL` (where the "Monitoring Dashboard" link points).

See the root `README.md` for current project status and roadmap.
