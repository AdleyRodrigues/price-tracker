import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from './routes';
import { ensureCupomSchema, ensureHistoricoSynced, getDbMode, isDbConfigured } from './db';
import { getLastHistoricoSyncIso } from './sync-historico';

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

// Modo file: puxa historico.db da branch (legado). Modo turso: no-op.
app.use('/api/*', async (c, next) => {
  try {
    await ensureHistoricoSynced(false);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[historico-sync] falha: ${msg}`);
  }
  await next();
});

app.get('/api/sync-status', (c) =>
  c.json({
    mode: getDbMode(),
    lastSyncIso: getLastHistoricoSyncIso(),
    dbConfigured: isDbConfigured(),
    skipRemoteSync: /^(1|true|yes|on)$/i.test(
      process.env.HISTORICO_SKIP_REMOTE_SYNC?.trim() ?? ''
    ),
  })
);

/** Força re-download do historico.db (útil após Actions publicar). */
app.post('/api/sync-historico', async (c) => {
  try {
    const { syncHistoricoFromRemote } = await import('./sync-historico');
    const { resetDbClient } = await import('./db');
    const result = await syncHistoricoFromRemote({
      force: true,
      beforeReplace: () => resetDbClient(),
    });
    if (result.updated) resetDbClient();
    if (result.reason.startsWith('replace-falhou:') || result.reason.startsWith('get-')) {
      return c.json({ ok: false, ...result }, 500);
    }
    return c.json({
      ok: true,
      mode: getDbMode(),
      ...result,
      lastSyncIso: getLastHistoricoSyncIso(),
      skipRemoteSync: /^(1|true|yes|on)$/i.test(
        process.env.HISTORICO_SKIP_REMOTE_SYNC?.trim() ?? ''
      ),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ ok: false, error: msg }, 500);
  }
});

/**
 * Reabre o client SQLite no arquivo local (TURSO_DATABASE_URL) sem baixar o remoto.
 * Use depois de um scrape local: o boot sync não precisa ter sobrescrito o DB.
 */
app.post('/api/reload-local-db', async (c) => {
  const { resetDbClient, isDbConfigured: configured } = await import('./db');
  if (!configured()) {
    return c.json({ ok: false, error: 'db-nao-configurado' }, 400);
  }
  resetDbClient();
  return c.json({
    ok: true,
    hint: 'Client reaberto. Com HISTORICO_SKIP_REMOTE_SYNC=1 o arquivo local não é sobrescrito.',
  });
});

app.route('/api', api);

if (isProd) {
  const distRel = path.relative(process.cwd(), path.resolve(__dirname, '../dist')).replace(/\\/g, '/');
  app.use('/*', serveStatic({ root: distRel }));
  app.get('*', serveStatic({ root: distRel, path: 'index.html' }));
}

async function main() {
  try {
    await ensureHistoricoSynced(true);
    console.log('[historico-sync] boot sync done');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[historico-sync] boot sync skip: ${msg}`);
  }

  try {
    await ensureCupomSchema();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[db] cupom schema: ${msg}`);
  }

  console.log(
    `[dashboard-api] listening on http://127.0.0.1:${port} (db=${isDbConfigured() ? 'ok' : 'missing'})`
  );

  serve({ fetch: app.fetch, port });
}

main();
