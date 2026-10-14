import { afterEach, expect, it, vi } from 'vitest';
import { requestJson } from './apiClient.js';
import { authState, clearAuth } from './authSession.js';
import { fetchUsterPar, uploadUster } from './dataService.js';

afterEach(() => { vi.unstubAllGlobals(); clearAuth(); });

it('preserva filas, cuerpo de importación y CSRF con el transporte común', async () => {
  authState.csrfToken = 'nonce';
  const fetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ rows: [{ TESTNR: 42 }] })));
  vi.stubGlobal('fetch', fetch);
  expect(await fetchUsterPar()).toEqual([{ TESTNR: 42 }]);
  await uploadUster({ TESTNR: 42 }, [{ SEQNO: 1 }]);
  const [url, options] = fetch.mock.calls[1];
  expect(url).toBe('/api/uster/upload');
  expect(JSON.parse(options.body)).toEqual({ par: { TESTNR: 42 }, tbl: [{ SEQNO: 1 }] });
  expect(options.headers.get('X-CSRF-Token')).toBe('nonce');
});

it('conserva mensaje, estado e identificador del error sin reintentar escrituras', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Ensayo inválido' }), { status: 400, headers: { 'X-Request-Id': 'request-42' } }));
  vi.stubGlobal('fetch', fetch);
  await expect(requestJson('/uster/upload', { method: 'POST', body: {} })).rejects.toMatchObject({ name: 'ApiError', message: 'Ensayo inválido', status: 400, requestId: 'request-42' });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('informa respuestas no JSON sin mostrar el HTML del servidor', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>proxy</html>', { status: 502 })));
  await expect(requestJson('/uster/par')).rejects.toMatchObject({ name: 'ApiError', status: 502, message: 'Error de API (502).' });
});
