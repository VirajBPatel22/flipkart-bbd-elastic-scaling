# backend/tests

Tests use Node's built-in test runner (`node --test`), so no extra test
framework dependency was added. `node --test` auto-discovers every
`*.test.js` file in this directory. Run them from `backend/`:

```bash
npm test
```

| File | What it checks | Needs a real database? |
|---|---|---|
| `health.test.js` | `GET /api/health` responds correctly | No |
| `products.validation.test.js` | Invalid `limit`/`category` query params are rejected with 400 | No |
| `products.unconfigured.test.js` | Missing `DATABASE_URL`/`SUPABASE_URL` produces a safe 500 config error (no secrets/connection string/stack leaked) | No — in fact it only runs when the database is *not* configured |
| `products.mocked.test.js` | Response shape, category filtering, limit bounding, and empty-table handling, against a fake in-memory `pg` Pool (`tests/helpers/fakeDb.js`) | No — uses a mock, not a real connection |

None of these tests connect to a real database. They verify the backend's
own logic (validation, error handling, response shape) in isolation. To
verify the **real** Supabase Postgres integration:

1. Configure `backend/.env` with a real `DATABASE_URL` (the Supabase
   "Connection string", see `database/README.md`).
2. Run the migration and seed SQL in your Supabase project.
3. Start the backend (`npm run dev`) and manually check:
   ```bash
   curl http://localhost:5000/api/products
   curl "http://localhost:5000/api/products?category=Electronics"
   ```
4. Confirm the returned data matches what you seeded.

This manual check is intentionally separate from the automated test suite,
since the automated tests must be able to run without any real credentials
(e.g. in CI).
