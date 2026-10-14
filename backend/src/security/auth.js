import express from 'express';
import { normalizeUsername, hashPassword, verifyPassword, randomToken, equalTokens } from './passwords.js';
import { canAccess, isAiRoute, ROLE_LEVEL } from './access.js';

const cookieName = config => config.production ? '__Host-stc_session' : 'stc_session';
function sessionToken(req, config) {
  const cookies = (req.headers.cookie || '').split(';').map(part => part.trim().split('='));
  const token = cookies.find(([name]) => name === cookieName(config))?.[1];
  return /^[a-f0-9]{64}$/.test(token || '') ? token : null;
}
const publicUser = user => ({ id: user.id, username: user.username, role: user.role });
const cookieOptions = config => ({ httpOnly: true, secure: config.production, sameSite: 'strict', path: config.production ? '/' : '/api', maxAge: config.sessionMs });
const fail = (status, message) => Object.assign(new Error(message), { statusCode: status });
const asyncHandler = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export function createAuth(repository, config) {
  const router = express.Router();
  router.post('/login', asyncHandler(async (req, res) => {
    if (!req.is('application/json')) throw fail(415, 'Se requiere JSON.');
    if (config.production && !req.secure) throw fail(426, 'Se requiere HTTPS.');
    const submitted = typeof req.body?.username === 'string' ? req.body.username : '';
    const key = submitted.slice(0, 64).toLowerCase();
    const ipAllowed = await repository.limit(`login:ip:${req.ip}`, 900000, 30);
    const accountAllowed = await repository.limit(`login:user:${key}`, 900000, 10);
    if (!ipAllowed || !accountAllowed) { res.set('Retry-After', '900'); throw fail(429, 'Demasiados intentos. Intente nuevamente más tarde.'); }
    let username;
    try { username = normalizeUsername(submitted); } catch { username = null; }
    const user = username ? await repository.findUser(username) : null;
    const matches = await verifyPassword(req.body?.password, user?.password_hash);
    if (!matches || !user?.enabled) throw fail(401, 'Usuario o contraseña incorrectos.');
    const previous = sessionToken(req, config);
    if (previous) await repository.revokeSession(previous);
    const token = randomToken();
    const csrfToken = randomToken();
    await repository.createSession(user.id, token, csrfToken, new Date(Date.now() + config.sessionMs));
    req.user = publicUser(user);
    res.cookie(cookieName(config), token, cookieOptions(config));
    res.json({ user: publicUser(user), csrfToken });
  }));

  const requireSession = asyncHandler(async (req, res, next) => {
    if (config.production && !req.secure) throw fail(426, 'Se requiere HTTPS.');
    const token = sessionToken(req, config);
    const session = token && await repository.session(token, config.idleMs);
    if (!session) throw fail(401, 'Inicie sesión para continuar.');
    req.user = publicUser(session);
    req.session = { token, csrfToken: session.csrf_token };
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (!equalTokens(req.get('X-CSRF-Token'), session.csrf_token)) throw fail(403, 'La sesión debe actualizarse antes de realizar esta operación.');
      if (!req.is('application/json')) throw fail(415, 'Se requiere JSON.');
    }
    next();
  });

  router.use(requireSession);
  router.get('/me', (req, res) => res.json({ user: req.user, csrfToken: req.session.csrfToken }));
  router.post('/logout', asyncHandler(async (req, res) => {
    await repository.revokeSession(req.session.token);
    res.clearCookie(cookieName(config), { ...cookieOptions(config), maxAge: undefined });
    res.json({ success: true });
  }));
  router.use('/users', (req, res, next) => req.user.role === 'administrador' ? next() : next(fail(403, 'Solo administradores pueden gestionar usuarios.')));
  router.use('/users', asyncHandler(async (req, res, next) => {
    if (!await repository.limit(`users:${req.user.id}`, 60000, 30)) { res.set('Retry-After', '60'); throw fail(429, 'Se alcanzó el límite de cambios/consultas de usuarios por minuto.'); }
    next();
  }));
  router.get('/users', asyncHandler(async (req, res) => res.json({ users: await repository.listUsers() })));
  router.post('/users', asyncHandler(async (req, res) => {
    if (!Object.hasOwn(ROLE_LEVEL, req.body?.role)) throw fail(400, 'Rol inválido.');
    const username = normalizeUsername(req.body.username);
    const passwordHash = await hashPassword(req.body.password);
    try { res.status(201).json({ user: await repository.createUser(username, passwordHash, req.body.role) }); }
    catch (error) { if (error.code === '23505') throw fail(409, 'El usuario ya existe.'); throw error; }
  }));
  router.patch('/users/:id', asyncHandler(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) throw fail(400, 'Identificador inválido.');
    const { role, enabled, password } = req.body || {};
    if (role !== undefined && !Object.hasOwn(ROLE_LEVEL, role)) throw fail(400, 'Rol inválido.');
    if (enabled !== undefined && typeof enabled !== 'boolean') throw fail(400, 'Estado inválido.');
    if (role === undefined && enabled === undefined && password === undefined) throw fail(400, 'No se enviaron cambios.');
    const passwordHash = password !== undefined ? await hashPassword(password) : undefined;
    res.json({ user: await repository.updateUser(req.params.id, { role, enabled, passwordHash }) });
  }));

  const authorize = asyncHandler(async (req, res, next) => {
    if (!canAccess(req.user.role, req.method, req.path)) throw fail(403, 'Su rol no tiene permiso para realizar esta operación.');
    if (!await repository.limit(`api:${req.user.id}`, 60000, 300)) {
      res.set('Retry-After', '60'); throw fail(429, 'Se alcanzó el límite de solicitudes por minuto.');
    }
    if (isAiRoute(req.path.replace(/\/+$/, '')) && !await repository.limit(`ai:${req.user.id}`, 60000, 10)) {
      res.set('Retry-After', '60'); throw fail(429, 'Se alcanzó el límite de análisis por minuto.');
    }
    next();
  });
  return { router, requireSession, authorize };
}
