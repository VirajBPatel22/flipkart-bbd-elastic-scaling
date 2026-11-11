# database

This directory holds the Supabase PostgreSQL schema and sample data for the
public product catalogue used by `backend`.

- `migrations/0001_create_products_table.sql` — creates the `products`
  table, its indexes, an `updated_at` trigger, and Row Level Security (RLS)
  policies.
- `seeds/0001_sample_products.sql` — inserts ~12 fictional sample products
  across several categories. **Not real Flipkart inventory or pricing.**

## How the backend connects

The backend connects **directly to Postgres** using the `pg` driver and the
Supabase "Connection string" — not through Supabase's REST API/JS client.
See `backend/src/config/db.js` for the connection pool and
`backend/src/services/products.service.js` for the parameterized SQL
queries.

> **Security note:** the direct connection string authenticates as the
> `postgres` superuser, which **bypasses Row Level Security**. The RLS
> policy created by the migration below still documents the intended access
> model and matters if you ever query the database through Supabase's REST
> API/JS client or the Supabase dashboard's own tools, but it does **not**
> restrict what this backend can do. The `WHERE is_active = true` filter
> hard-coded into `products.service.js`, plus the fact that this backend has
> no insert/update/delete routes, are what currently keep this API
> read-only and limited to active products. Treat `DATABASE_URL` exactly
> like a password — never commit it, never put it in frontend code.

## 1. Create or select a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Create a new project (or pick an existing one for this course project).
   Set a database password and **save it somewhere safe** — you will need
   it to build the connection string in step 4 below.
3. Wait for the project to finish provisioning.

## 2. Run the migration and seed SQL

Both files are plain PostgreSQL and are run through the Supabase dashboard
— no Supabase CLI is required for this phase.

1. Open your project in the Supabase dashboard.
2. Go to **SQL Editor** → **New query**.
3. Paste the full contents of `database/migrations/0001_create_products_table.sql`
   and click **Run**.
4. Open another **New query**, paste the full contents of
   `database/seeds/0001_sample_products.sql`, and click **Run**.

Re-running either script is safe:
- The migration uses `if not exists` / `create or replace` / `drop ... if exists`.
- The seed script upserts on the unique `products.name` column instead of
  inserting duplicates (`on conflict (name) do update ...`).

## 3. Required environment variables

Add this to `backend/.env` (copy from `backend/.env.example` first — never
commit the real `.env` file):

| Variable | Where to find it | Notes |
|---|---|---|
| `DATABASE_URL` | Project Settings → Database → **Connection string** → "URI" tab | Full `postgresql://postgres:[password]@...:5432/postgres` string. Choose "Direct connection" (or "Session pooler") — this backend is a long-running server, not serverless/edge. |

The backend also accepts this same value under the variable name
`SUPABASE_URL` for backward compatibility with earlier setups, but
`DATABASE_URL` is the preferred name going forward. A Supabase
anon/publishable API key is **not** needed by this backend anymore, since
it talks to Postgres directly rather than through Supabase's REST API.

**Never** put this connection string in a frontend `.env` file — it grants
full database access, not just read-only product access.

## 4. Verify the table and RLS policy

In the Supabase SQL Editor, run:

```sql
select count(*) from public.products;
select * from public.products limit 5;
```

To confirm the RLS policy exists (informational — see the security note
above about what it actually protects once connecting directly as
`postgres`):

```sql
select polname, cmd, qual from pg_policies where tablename = 'products';
```

You should see exactly one policy, `Public can read active products`, for
the `SELECT` command, with `qual` equal to `(is_active = true)`.

You can also verify from the backend once it's configured:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/products
curl "http://localhost:5000/api/products?category=Electronics"
curl "http://localhost:5000/api/products?limit=3"
```

## 5. Reseeding sample products safely

If you edit `database/seeds/0001_sample_products.sql` (e.g. to tweak prices
or add products) or just want to refresh the data, simply re-run the file in
the SQL Editor. Existing rows are matched by `name` and updated in place;
new rows are inserted. No duplicates are created.

To remove all sample data and start over:

```sql
truncate table public.products;
```

Then re-run the seed script.
