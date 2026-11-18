const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const API_BASE_URL =
  env.VITE_API_BASE_URL !== undefined
    ? env.VITE_API_BASE_URL
    : 'http://localhost:5000';


export const DASHBOARD_URL =
  env.VITE_DASHBOARD_URL || 'http://localhost:5174';
