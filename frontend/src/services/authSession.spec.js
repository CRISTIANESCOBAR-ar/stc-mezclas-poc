import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiFetch, authState, clearAuth, login, loadSession, logout, can } from './authSession.js';

beforeEach(() => { clearAuth(); localStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); clearAuth(); });

it('envía CSRF y cookies para escrituras sin guardar tokens en localStorage', async () => {
  authState.user = { role: 'operador' }; authState.csrfToken = 'nonce';
  const mock = vi.fn().mockResolvedValue({ status: 200 });
  vi.stubGlobal('fetch', mock);
  await apiFetch('/api/uster/upload', { method: 'POST', body: '{}' });
  const options = mock.mock.calls[0][1];
  expect(options.headers.get('X-CSRF-Token')).toBe('nonce');
  expect(options.credentials).toBe('same-origin');
  expect(options.redirect).toBe('error');
  expect(localStorage.length).toBe(0);
  expect(can('operador')).toBe(true);
  expect(can('administrador')).toBe(false);
});
it('rechaza APIs externas y no envía CSRF a recursos de exportación', async () => {
  authState.csrfToken = 'nonce';
  const mock = vi.fn().mockResolvedValue({ status: 200 }); vi.stubGlobal('fetch', mock);
  await expect(apiFetch('https://example.com/api/data')).rejects.toThrow('mismo origen');
  expect(mock).not.toHaveBeenCalled();
  await apiFetch('data:image/png;base64,AAAA');
  expect(mock.mock.calls[0][1].headers.has('X-CSRF-Token')).toBe(false);
});
it('inicia, recupera y cierra la sesión sin exponer la cookie a JavaScript', async () => {
  const user = { id: 1, username: 'operador', role: 'operador' };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({ user, csrfToken: 'csrf' }) }));
  await login('operador', 'test password');
  expect(authState.user).toEqual(user);
  clearAuth();
  await loadSession(true);
  expect(authState.user).toEqual(user);
  await logout();
  expect(authState.user).toBe(null);
  expect(authState.csrfToken).toBe(null);
});
it('una sesión vencida limpia permisos y notifica al router', async () => {
  authState.user = { role: 'administrador' }; authState.csrfToken = 'csrf';
  const expired = vi.fn(); window.addEventListener('stc-session-expired', expired);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }));
  try {
    await apiFetch('/api/inventory/cotton-bales');
    expect(authState.user).toBe(null);
    expect(can('consulta')).toBe(false);
    expect(expired).toHaveBeenCalledTimes(1);
  } finally { window.removeEventListener('stc-session-expired', expired); }
});
