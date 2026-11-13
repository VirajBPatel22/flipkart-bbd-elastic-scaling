// Thin wrapper around fetch for talking to the backend API.
// This is the ONLY place in the frontend that should know about backend
// URLs/response shapes. The frontend always goes through this Node.js API;
// it never queries Supabase directly.

import { API_BASE_URL } from './config.js';

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function getHealth({ signal } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/health`, { signal });
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json();
}

/**
 * Fetches active products from the backend.
 * @param {{ category?: string|null, limit?: number, signal?: AbortSignal }} options
 * @returns {Promise<{ data: object[], count: number }>}
 */
export async function getProducts({ category, limit, signal } = {}) {
  const params = new URLSearchParams();
  if (category) {
    params.set('category', category);
  }
  if (limit) {
    params.set('limit', String(limit));
  }

  const query = params.toString();
  const url = `${API_BASE_URL}/api/products${query ? `?${query}` : ''}`;

  let response;
  try {
    response = await fetch(url, { signal });
  } catch (networkError) {
    if (networkError.name === 'AbortError') {
      throw networkError;
    }
    const error = new Error(
      'Could not reach the backend API. Make sure it is running and VITE_API_BASE_URL is correct.',
    );
    error.cause = networkError;
    throw error;
  }

  const body = await parseJsonSafely(response);

  if (!response.ok) {
    const message =
      body && typeof body.message === 'string'
        ? body.message
        : `Request failed with status ${response.status}.`;
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  if (!body || !Array.isArray(body.data)) {
    throw new Error(
      'Received an unexpected response format from the backend API.',
    );
  }

  const count =
    body.meta && typeof body.meta.count === 'number'
      ? body.meta.count
      : body.data.length;

  return { data: body.data, count };
}
