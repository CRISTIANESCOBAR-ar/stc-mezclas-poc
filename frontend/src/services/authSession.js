import { reactive } from 'vue';

export const authState = reactive({ user: null, csrfToken: null, loaded: false });
const roles = { consulta: 0, operador: 1, administrador: 2 };
export function can(role) { return Boolean(authState.user && roles[authState.user.role] >= roles[role]); }
export function clearAuth() { authState.user = null; authState.csrfToken = null; authState.loaded = true; }

// Shared transport for existing fetch callers. Session tokens stay in HttpOnly
// cookies; only the CSRF token lives in memory, never localStorage.
export async function apiFetch(input, options = {}) {
  const raw = typeof input === 'string' ? input : input.url;
  const url = new URL(raw, window.location.origin);
  const method = (options.method || input?.method || 'GET').toUpperCase();
  const isApi = url.pathname.startsWith('/api/');
  if (isApi && url.origin !== window.location.origin) throw new Error('Las llamadas API deben usar el mismo origen que la aplicación.');
  const headers = new Headers(options.headers || input?.headers);
  if (url.origin === window.location.origin && url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(method) && authState.csrfToken) headers.set('X-CSRF-Token', authState.csrfToken);
  const response = await globalThis.fetch(input, { ...options, headers, credentials: 'same-origin', ...(isApi ? { redirect: 'error' } : {}) });
  if (isApi && response.status === 401 && url.pathname !== '/api/auth/login') {
    clearAuth();
    window.dispatchEvent(new Event('stc-session-expired'));
  }
  return response;
}

let loading;
export async function loadSession(force = false) {
  if (authState.loaded && !force) return authState.user;
  if (loading) return loading;
  loading = (async () => {
    const response = await apiFetch('/api/auth/me');
    if (response.status === 401) { clearAuth(); return null; }
    if (!response.ok) throw new Error('No se pudo verificar la sesión.');
    const data = await response.json();
    authState.user = data.user; authState.csrfToken = data.csrfToken; authState.loaded = true;
    return data.user;
  })();
  try { return await loading; } finally { loading = null; }
}

export async function login(username, password) {
  const response = await apiFetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo iniciar sesión.');
  authState.user = data.user; authState.csrfToken = data.csrfToken; authState.loaded = true;
}

export async function logout() {
  const response = await apiFetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (!response.ok && response.status !== 401) throw new Error('No se pudo cerrar la sesión.');
  clearAuth();
}
