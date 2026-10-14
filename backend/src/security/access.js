export const ROLE_LEVEL = { consulta: 0, operador: 1, administrador: 2 };
const calculate = new Set([
  '/inventory/blendomat', '/config/audit', '/hvi/check-files', '/hvi/get-metadata', '/hvi/details',
  '/hvi/predecir-hilatura', '/hvi/analizar-mezcla', '/hvi/analizar-relato-integral',
  '/uster/status', '/uster/husos', '/tensorapid/status', '/uster-cardas/status', '/hvi-crudo/status',
  '/oe/diagnostico-ia', '/dashboard/narrativa-lotes',
]);
const imports = new Set(['/hvi/save', '/uster/upload', '/tensorapid/upload', '/uster-cardas/upload', '/hvi-crudo/upload']);
const normalizePath = path => path.toLowerCase().replace(/\/+$/, '') || '/';
export const isAiRoute = path => ['/hvi/predecir-hilatura', '/hvi/analizar-mezcla', '/hvi/analizar-relato-integral', '/oe/diagnostico-ia', '/dashboard/narrativa-lotes'].includes(normalizePath(path));

export function minimumRole(method, path) {
  // Express routers match case-insensitively. Policy must use the same
  // semantics, otherwise /dashboard/BACKUPS could bypass its admin rule.
  path = normalizePath(path);
  if (path.startsWith('/auth/users') || path.startsWith('/operations') || ['/dashboard/backups', '/dashboard/narrativa-costos'].includes(path)) return 'administrador';
  if (method === 'GET' || method === 'HEAD') return 'consulta';
  if (method === 'POST' && calculate.has(path)) return 'consulta';
  if (method === 'POST' && imports.has(path)) return 'operador';
  if (method === 'PATCH' && /^\/uster\/tests\/[^/]+\/manual$/.test(path)) return 'operador';
  if (method === 'PATCH' && /^\/uster-cardas\/tests\/[^/]+\/[^/]+\/manual$/.test(path)) return 'operador';
  if (method === 'PATCH' && /^\/tensorapid\/tests\/[^/]+\/link$/.test(path)) return 'operador';
  if (method === 'PUT' && path === '/config/standards') return 'administrador';
  if (method === 'DELETE' && /^\/(hvi\/saved|uster\/delete|tensorapid\/delete|uster-cardas\/delete)\/[^/]+$/.test(path)) return 'administrador';
  return null; // New write endpoints require an explicit permission policy.
}

export function canAccess(role, method, path) {
  const required = minimumRole(method, path);
  return required !== null && Object.hasOwn(ROLE_LEVEL, role) && ROLE_LEVEL[role] >= ROLE_LEVEL[required];
}
