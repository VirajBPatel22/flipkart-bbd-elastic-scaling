# frontend

React + Vite storefront for the Flipkart BBD Elastic Scaling project.

## Structure

- `src/components/` — reusable UI pieces (`Header`, `SaleBanner`,
  `CategoryFilter`, `ProductCard`, `ProductGrid`, `ApiStatus`,
  `LoadingState`, `ErrorState`, `Footer`, `StatusBanner`).
- `src/pages/HomePage.jsx` — the storefront page, composed from the
  components above.
- `src/hooks/` — `useProducts` (fetches `GET /api/products`, with race-safe
  category refetching), `useCategories` (derives category filter pills from
  the full catalogue), `useApiHealth` (polls `GET /api/health`),
  `useUrlFilter` (synchronizes category & search with URL query parameters and popstate).
- `src/services/apiClient.js` — the only place that knows backend URLs and
  response shapes. The frontend always calls the Node.js API; it never
  queries Supabase directly.
- `src/services/config.js` — reads `VITE_*` environment variables.
- `src/styles/global.css` — all storefront styling (no UI framework).

## Environment variables

Copy `.env.example` to `.env` and adjust if needed:

- `VITE_API_BASE_URL` — backend API base URL (default `http://localhost:5000`).
- `VITE_DASHBOARD_URL` — monitoring dashboard URL for the nav/footer link
  (default `http://localhost:5174`).

Only `VITE_`-prefixed variables are available in the browser bundle — never
put secrets here.

## Scripts

```bash
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build into dist/
npm run lint     # oxlint
npm test         # run automated tests (node --test)
npm run preview  # preview the production build locally
```

## Notes on data

This storefront shows **real** data returned by the backend's
`GET /api/products`. If the backend is unreachable or Supabase has not been
configured yet, the product grid shows an explicit error state with a
Retry button — it does not fall back to fabricated product data.
