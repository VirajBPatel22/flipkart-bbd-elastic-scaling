// Centralized place to read Vite environment variables used across the
// storefront. Vite only exposes VITE_-prefixed variables to the browser
// bundle, so nothing private (AWS keys, Supabase service-role keys,
// database passwords) may ever be read here.

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:5000';

// Local placeholder dashboard URL. The real monitoring implementation is
// built in a later phase; for now this just links out to the existing
// placeholder dashboard app.
export const DASHBOARD_URL =
  import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5174';
