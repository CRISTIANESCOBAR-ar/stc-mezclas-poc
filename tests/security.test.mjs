import test, { before } from 'node:test';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createApp } from '../backend/src/app.js';
import { readConfig, requireDatabaseConfig } from '../backend/src/config.js';
import { hashPassword, verifyPassword, tokenHash } from '../backend/src/security/passwords.js';
import { canAccess, minimumRole } from '../backend/src/security/access.js';

const require = createRequire(new URL('../backend/package.json', import.meta.url));
const express = require('express');
const password = 'test password with 20 chars';
let app, repository;
const base = 'http://127.0.0.1';
const origin = 'http://localhost:5173';

class MemoryRepository {
  constructor(users) { this.users = users; this.sessions = new Map(); this.counts = new Map(); }
  async findUser(username) { return this.users.find(user => user.username === username); }
  async createSession(id, token, csrf, expiresAt) { this.sessions.set(tokenHash(token), { id, csrf_token: csrf, expires_at: expiresAt, lastSeen: Date.now() }); }
  async session(token, idleMs) {
    const session = this.sessions.get(tokenHash(token));
    const user = session && this.users.find(user => user.id === session.id);
    if (!user?.enabled || new Date(session.expires_at) <= new Date() || session.lastSeen < Date.now() - idleMs) return null;
    session.lastSeen = Date.now();
    return { ...session, ...user };
  }
  async revokeSession(token) { this.sessions.delete(tokenHash(token)); }
  async limit(key, window, maximum) { const count = (this.counts.get(key) || 0) + 1; this.counts.set(key, count); return count <= maximum; }
  async listUsers() { return this.users.map(({ password_hash, ...user }) => user); }
}

before(async () => {
  const hash = await hashPassword(password);
  repository = new MemoryRepository(['consulta', 'operador', 'administrador'].map((role, index) => ({ id: index + 1, username: role, role, enabled: true, password_hash: hash })));
  const config = readConfig({ NODE_ENV: 'test', APP_ORIGIN: origin, STC_BACKUP_ENABLED: 'false' });
  const inventory = express.Router();
  inventory.get('/cotton-bales', (req, res) => res.json([]));
  inventory.post('/blendomat', (req, res) => res.json({ success: true }));
  inventory.get('/failure', async () => { throw new Error('SELECT secret_password FROM private_schema'); });
  const uster = express.Router();
  uster.post('/upload', (req, res) => res.status(201).json({ success: true }));
  uster.delete('/delete/:testnr', (req, res) => res.json({ success: true }));
  const standards = express.Router();
  standards.put('/standards', (req, res) => res.json({ success: true }));
  app = createApp({ config, pool: { query: async () => ({ rows: [] }) }, authRepository: repository,
    backup: { getStatus: async () => ({ enabled: false }) }, routers: { inventory, uster, config: standards } });
});

// Exercise the full Express/body-parser/auth/error pipeline with Node HTTP
// request/response objects, without opening network sockets or a real DB.
async function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    socket.encrypted = Boolean(options.secure);
    Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' });
    const req = new IncomingMessage(socket);
    req.method = options.method || 'GET';
    const parsed = new URL(url);
    req.url = parsed.pathname + parsed.search;
    req.headers = Object.fromEntries(Object.entries(options.headers || {}).map(([key,value]) => [key.toLowerCase(), value]));
    const body = options.body || '';
    if (body) req.headers['content-length'] = String(Buffer.byteLength(body));
    const res = new ServerResponse(req);
    res.end = (data) => {
      const text = data?.toString() || '';
      const headers = new Headers();
      for (const [key, value] of Object.entries(res.getHeaders())) headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
      res.emit('finish');
      resolve(new Response(text || null, { status: res.statusCode, headers }));
      socket.destroy();
      return res;
    };
    app.handle(req, res, error => error ? reject(error) : reject(new Error('Unhandled route')));
    if (body) req.push(Buffer.from(body));
    req.push(null);
  });
}

async function login(role) {
  const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: role, password }) });
  assert.equal(response.status, 200);
  return { cookie: response.headers.get('set-cookie').split(';')[0], csrf: (await response.json()).csrfToken, header: response.headers.get('set-cookie') };
}
async function call(path, session, method = 'GET', headers = {}) {
  return fetch(`${base}/api${path}`, { method, headers: { Origin: origin, ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}), ...(!['GET', 'HEAD'].includes(method) ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(!['GET', 'HEAD'].includes(method) ? { body: '{}' } : {}) });
}

test('anonymous requests cannot access data; health exposes no paths or backup state', async () => {
  assert.equal((await call('/inventory/cotton-bales')).status, 401);
  const health = await call('/health');
  assert.equal(health.status, 200);
  assert.deepEqual(Object.keys(await health.json()).sort(), ['ok', 'timestamp']);
  assert.equal(health.headers.get('x-powered-by'), null);
});
test('login stores an opaque session, with HttpOnly/SameSite and no password in response', async () => {
  const session = await login('consulta');
  assert.match(session.header, /HttpOnly/);
  assert.match(session.header, /SameSite=Strict/);
  const info = await call('/auth/me', session);
  assert.equal(info.status, 200);
  const data = await info.json();
  assert.equal(data.user.role, 'consulta');
  assert.equal(data.user.password_hash, undefined);
  assert.equal(info.headers.get('cache-control'), 'no-store');
  assert.ok([...repository.sessions.keys()].every(key => !session.cookie.includes(key)));
});
test('role matrix: consultation calculates, operators import, administrators configure and delete', async () => {
  const reader = await login('consulta');
  assert.equal((await call('/inventory/blendomat', reader, 'POST')).status, 200);
  assert.equal((await call('/uster/upload', reader, 'POST')).status, 403);
  const operator = await login('operador');
  assert.equal((await call('/uster/upload', operator, 'POST')).status, 201);
  assert.equal((await call('/config/standards', operator, 'PUT')).status, 403);
  assert.equal((await call('/uster/delete/123', operator, 'DELETE')).status, 403);
  assert.equal((await call('/auth/users', operator)).status, 403);
  const admin = await login('administrador');
  assert.equal((await call('/config/standards', admin, 'PUT')).status, 200);
  assert.equal((await call('/uster/delete/123', admin, 'DELETE')).status, 200);
  assert.equal((await call('/auth/users', admin)).status, 200);
  assert.equal((await call('/inventory/new-write-endpoint', admin, 'POST')).status, 403);
});
test('CSRF and origins are enforced even with a valid session', async () => {
  const session = await login('administrador');
  assert.equal((await call('/config/standards', session, 'PUT', { 'X-CSRF-Token': '' })).status, 403);
  assert.equal((await call('/config/standards', session, 'PUT', { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await call('/config/standards', session, 'PUT', { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
});
test('logout revokes the session server-side', async () => {
  const session = await login('operador');
  assert.equal((await call('/auth/logout', session, 'POST')).status, 200);
  assert.equal((await call('/inventory/cotton-bales', session)).status, 401);
});
test('expired or disabled sessions are rejected', async () => {
  const session = await login('operador');
  repository.users[1].enabled = false;
  assert.equal((await call('/inventory/cotton-bales', session)).status, 401);
  repository.users[1].enabled = true;
  const current = repository.sessions.get(tokenHash(session.cookie.split('=')[1]));
  current.expires_at = new Date(0);
  assert.equal((await call('/inventory/cotton-bales', session)).status, 401);
});
test('asynchronous failures become safe responses with a request identifier', async () => {
  const session = await login('consulta');
  const response = await call('/inventory/failure', session);
  assert.equal(response.status, 500);
  const data = await response.json();
  assert.ok(data.requestId);
  assert.equal(data.requestId, response.headers.get('x-request-id'));
  assert.ok(!JSON.stringify(data).includes('secret_password'));
});
test('login attempts are bounded and errors do not disclose whether a user exists', async () => {
  repository.counts.set('login:user:unknown', 10);
  const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'unknown', password }) });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '900');
});
test('password hashing is salted and verifies the complete password', async () => {
  const first = await hashPassword(password), second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(`${password}x`, first), false);
  assert.equal(await verifyPassword(password, 'bad hash'), false);
});
test('production configuration requires HTTPS and explicit database credentials', () => {
  assert.throws(() => readConfig({ NODE_ENV: 'production', APP_ORIGIN: 'http://example.com' }), /HTTPS/);
  assert.throws(() => requireDatabaseConfig(readConfig({ NODE_ENV: 'test' })), /PG_DATABASE/);
  assert.throws(() => readConfig({ STC_TRUST_PROXY: 'true' }), /STC_TRUST_PROXY/);
  assert.equal(canAccess('operador', 'PUT', '/config/standards'), false);
  assert.equal(minimumRole('POST', '/new-route'), null);
});

test('production rejects plaintext login and emits Secure cookies over TLS', async () => {
  const previous = app;
  const config = readConfig({ NODE_ENV: 'production', APP_ORIGIN: 'https://stc.example' });
  app = createApp({ config, pool: { query: async () => ({ rows: [] }) }, authRepository: repository,
    backup: { getStatus: async () => ({}) }, routers: {} });
  const options = { method: 'POST', headers: { Origin: 'https://stc.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'administrador', password }) };
  try {
    assert.equal((await fetch(`${base}/api/auth/login`, options)).status, 426);
    const response = await fetch(`${base}/api/auth/login`, { ...options, secure: true });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /Secure/);
  } finally { app = previous; }
});

test('case-insensitive routes and trailing slashes cannot bypass admin restrictions', async () => {
  const reader = await login('consulta');
  for (const path of ['/operations/status', '/OPERATIONS/status/', '/dashboard/BACKUPS/', '/dashboard/NARRATIVA-COSTOS/']) assert.equal((await call(path, reader)).status, 403);
  assert.equal((await call('/INVENTORY/BLENDOMAT/', reader, 'POST')).status, 200);
});
