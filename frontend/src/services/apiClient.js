import { apiFetch } from './authSession.js';

export class ApiError extends Error {
  constructor(message, status, requestId) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
  }
}

// No automatic retries: imports and deletions must not run twice.
export async function requestJson(endpoint, { body, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await apiFetch(`/api${endpoint}`, {
    ...options, headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const requestId = response.headers?.get('X-Request-Id') || undefined;
  let data;
  try { data = await response.json(); }
  catch {
    throw new ApiError(response.ok ? 'La API devolvió una respuesta JSON inválida.' : `Error de API (${response.status}).`, response.status, requestId);
  }
  if (!response.ok) throw new ApiError(data?.error || `Error de API (${response.status}).`, response.status, requestId);
  return data;
}
