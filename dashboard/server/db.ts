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

export function resetDbClient(): void {
  if (client) {
    try {
      client.close();
    } catch {
      // ignore
    }
    client = null;
  }
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

export function isDbConfigured(): boolean {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) return false;
  if (url.startsWith('file:')) return true;
  return Boolean(process.env.TURSO_AUTH_TOKEN?.trim());
}

/** Sincroniza SQLite local com a branch historico-data e reabre o client se baixou. */
export async function ensureHistoricoSynced(force = false): Promise<void> {
  const result = await syncHistoricoFromRemote({ force });
  if (result.updated) {
    resetDbClient();
  }
}
