import { randomUUID } from 'node:crypto';

export function logEvent(event, fields = {}) { console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...fields })); }

export function protectRouter(router) {
  for (const layer of router.stack) {
    if (!layer.route) continue;
    for (const entry of layer.route.stack) {
      const handler = entry.handle;
      entry.handle = (req, res, next) => {
        try { Promise.resolve(handler(req, res, next)).catch(next); }
        catch (error) { next(error); }
      };
    }
  }
  return router;
}

export function requestContext(pool) {
  return (req, res, next) => {
    req.requestId = randomUUID();
    res.set('X-Request-ID', req.requestId);
    const start = performance.now();
    const originalJson = res.json.bind(res);
    res.json = payload => {
      if (res.statusCode >= 400) {
        const safe = res.statusCode < 500 ? (payload?.error || payload?.message || 'Solicitud inválida.') : `No se pudo completar la operación. Identificador: ${req.requestId}.`;
        payload = { ...(res.statusCode < 500 ? payload : {}), success: false, ok: false, error: safe, message: safe, requestId: req.requestId };
      }
      return originalJson(payload);
    };
    res.on('finish', () => {
      const route = req.originalUrl.split('?')[0].slice(0, 1000);
      logEvent('http', { requestId: req.requestId, userId: req.user?.id || null, method: req.method, path: route, status: res.statusCode, durationMs: Math.round(performance.now() - start) });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        pool.query('INSERT INTO stc_audit_log (request_id, actor_id, method, path, status) VALUES ($1, $2, $3, $4, $5)', [req.requestId, req.user?.id || null, req.method, route, res.statusCode])
          .catch(error => logEvent('audit_write_failed', { requestId: req.requestId, code: error.code || 'ERROR' }));
      }
    });
    next();
  };
}

export function securityHeaders(config) {
  return (req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cross-Origin-Resource-Policy': 'same-origin' });
    if (config.production) {
      res.set('Strict-Transport-Security', 'max-age=31536000');
      res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    }
    next();
  };
}

export function originPolicy(config) {
  return (req, res, next) => {
    if (req.get('Sec-Fetch-Site') === 'cross-site' || (req.get('Origin') && !config.origins.includes(req.get('Origin')))) {
      return res.status(403).json({ error: 'Origen no autorizado.' });
    }
    next();
  };
}

export function errorHandler(error, req, res, next) {
  logEvent('request_error', { requestId: req.requestId, code: error.code || error.type || 'ERROR' });
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : Number(error.statusCode || error.status) || 500;
  const message = status === 413 ? 'El archivo o la solicitud supera el tamaño permitido.' : error.type === 'entity.parse.failed' ? 'JSON inválido.' : error.message;
  res.status(status >= 400 && status <= 599 ? status : 500).json({ error: message });
}
