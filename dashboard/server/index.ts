import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from './routes';
import { isDbConfigured } from './db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 8787);

const app = new Hono();

app.use('*', logger());
app.use(
  '/api/*',
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  })
);

app.route('/api', api);

if (isProd) {
  const distRel = path.relative(process.cwd(), path.resolve(__dirname, '../dist')).replace(/\\/g, '/');
  app.use('/*', serveStatic({ root: distRel }));
  app.get('*', serveStatic({ root: distRel, path: 'index.html' }));
}

console.log(
  `[dashboard-api] listening on http://127.0.0.1:${port} (db=${isDbConfigured() ? 'ok' : 'missing'})`
);

serve({ fetch: app.fetch, port });
