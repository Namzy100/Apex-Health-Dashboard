/**
 * Centralized API base URL.
 *
 * Dev:  Vite proxies /api → http://localhost:3001, so /api works.
 * Prod: Same-origin /api — works on Vercel (serverless) or any Node host.
 *
 * Usage:
 *   import { API_BASE } from '../utils/apiBase';
 *   fetch(`${API_BASE}/ai/log`, { ... })
 */
export const API_BASE = '/api';

/**
 * Convenience wrapper: POST to an API endpoint, return parsed JSON or null.
 * Never throws — callers can assume null means "unavailable".
 */
export async function apiPost(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiGet(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
