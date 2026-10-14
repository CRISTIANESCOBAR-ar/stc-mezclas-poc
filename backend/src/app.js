import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createAuth } from './security/auth.js';
import { requestContext, securityHeaders, originPolicy, errorHandler, protectRouter } from './http.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import standardsRoutes from './routes/standardsRoutes.js';
import hviRoutes from './routes/hviRoutes.js';
import oeRoutes from './routes/oeRoutes.js';
import usterRoutes from './routes/usterRoutes.js';
import tensorapidRoutes from './routes/tensorapidRoutes.js';
import usterCardasRoutes from './routes/usterCardasRoutes.js';
import calidadFibraRoutes from './routes/calidadFibraRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import hviCrudoRoutes from './routes/hviCrudoRoutes.js';

export function createApp({ config, pool, authRepository, backup, ready = () => true, routers } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(requestContext(pool), securityHeaders(config));
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', originPolicy(config));
  app.use('/api', cors({ origin: config.origins, credentials: true, methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'X-CSRF-Token'], exposedHeaders: ['X-Request-ID'] }));
  app.get('/api/health/live', (req, res) => res.json({ ok: true }));
  app.get('/api/health', async (req, res, next) => {
    try {
      if (!ready()) return res.status(503).json({ error: 'Servicio no disponible.' });
      await pool.query('SELECT 1');
      res.json({ ok: true, timestamp: new Date().toISOString() });
    } catch (error) { next(Object.assign(error, { statusCode: 503 })); }
  });
  const auth = createAuth(authRepository, config);
  app.use('/api/auth', express.json({ limit: '16kb' }), auth.router);
  app.use('/api', auth.requireSession, auth.authorize, express.json({ limit: config.jsonLimit }));
  app.get('/api/operations/status', async (req, res, next) => {
    try { res.json({ ok: ready(), backups: await backup.getStatus(), database: 'available' }); }
    catch (error) { next(error); }
  });
  const actualRouters = routers || {
    inventory: inventoryRoutes, config: standardsRoutes, hvi: hviRoutes, oe: oeRoutes,
    uster: usterRoutes, tensorapid: tensorapidRoutes, 'uster-cardas': usterCardasRoutes,
    'calidad-fibra': calidadFibraRoutes, dashboard: dashboardRoutes, 'hvi-crudo': hviCrudoRoutes,
  };
  for (const [name, router] of Object.entries(actualRouters)) app.use(`/api/${name}`, protectRouter(router));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
  if (config.production && existsSync(path.join(config.frontendDist, 'index.html'))) {
    app.use(express.static(config.frontendDist, { index: false, setHeaders: res => res.set('Cache-Control', 'no-cache') }));
    app.get('*', (req, res) => res.sendFile(path.join(config.frontendDist, 'index.html')));
  }
  app.use(errorHandler);
  return app;
}
