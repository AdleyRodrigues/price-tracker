import { createClient, type Client } from '@libsql/client';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncHistoricoFromRemote } from './sync-historico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carrega .env do root do monorepo e do dashboard
loadEnv({ path: path.resolve(__dirname, '../../.env') });
loadEnv({ path: path.resolve(__dirname, '../.env') });

let client: Client | null = null;
let cupomSchemaReady = false;

export function resetDbClient(): void {
  if (client) {
    try {
      client.close();
    } catch {
      // ignore
    }
    client = null;
  }
  cupomSchemaReady = false;
}

export function getDb(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) {
    throw new Error('TURSO_DATABASE_URL é obrigatório para a API do dashboard.');
  }

  if (url.startsWith('file:')) {
    client = createClient({ url });
    return client;
  }

  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!authToken) {
    throw new Error(
      'TURSO_AUTH_TOKEN é obrigatório para bancos Turso remotos (libsql://...).'
    );
  }

  client = createClient({ url, authToken });
  return client;
}

/** Colunas cupom_tag / cupom_desconto (idempotente). */
export async function ensureCupomSchema(): Promise<void> {
  if (cupomSchemaReady || !isDbConfigured()) return;
  const db = getDb();
  for (const sql of [
    'ALTER TABLE price_snapshots ADD COLUMN cupom_tag TEXT',
    'ALTER TABLE price_snapshots ADD COLUMN cupom_desconto REAL',
  ]) {
    try {
      await db.execute(sql);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/duplicate column|already exists/i.test(msg)) {
        console.warn(`[db] migrate cupom: ${msg}`);
      }
    }
  }
  cupomSchemaReady = true;
}

export function isDbConfigured(): boolean {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) return false;
  if (url.startsWith('file:')) return true;
  return Boolean(process.env.TURSO_AUTH_TOKEN?.trim());
}

/** `turso` = libsql/https remoto; `file` = SQLite local (+ sync historico-data legado). */
export function getDbMode(): 'turso' | 'file' | 'unset' {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) return 'unset';
  if (url.startsWith('file:')) return 'file';
  return 'turso';
}

/** Sincroniza SQLite local com a branch historico-data e reabre o client se baixou. */
export async function ensureHistoricoSynced(force = false): Promise<void> {
  const result = await syncHistoricoFromRemote({
    force,
    // Windows: não dá para rename/overwrite com o libSQL ainda segurando o arquivo
    beforeReplace: () => resetDbClient(),
  });
  if (result.updated) {
    resetDbClient();
  } else if (result.reason.startsWith('replace-falhou:')) {
    console.warn(`[historico-sync] ${result.reason}`);
  }
}
