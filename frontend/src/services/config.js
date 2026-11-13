// Centralized place to read Vite environment variables used across the
// storefront. Vite only exposes VITE_-prefixed variables to the browser
// bundle, so nothing private (AWS keys, Supabase service-role keys,
// database passwords) may ever be read here.

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const API_BASE_URL =
  env.VITE_API_BASE_URL !== undefined
    ? env.VITE_API_BASE_URL
    : 'http://localhost:5000';

// Dashboard entry point; AWS demo builds point operators to their SSM tunnel.
export const DASHBOARD_URL =
  env.VITE_DASHBOARD_URL || 'http://localhost:5174';
