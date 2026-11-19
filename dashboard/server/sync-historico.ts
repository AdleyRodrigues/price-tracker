import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_REMOTE =
  'https://raw.githubusercontent.com/AdleyRodrigues/price-tracker/historico-data/historico.db';

const MIN_INTERVAL_MS = 60_000;

let lastAttempt = 0;
let lastSuccessIso: string | null = null;

function localPathFromTursoUrl(url: string): string | null {
  if (!url.startsWith('file:')) return null;
  const raw = url.slice('file:'.length);
  // file:///C:/... ou file:C:/... ou file:/home/...
  if (raw.startsWith('///') || raw.startsWith('//')) {
    try {
      return fileURLToPath(url.includes('file://') ? url : `file://${raw}`);
    } catch {
      return raw.replace(/^\/+/, '');
    }
  }
  return raw;
}

export function getLastHistoricoSyncIso(): string | null {
  return lastSuccessIso;
}

/**
 * Baixa historico.db da branch historico-data (Actions) para o SQLite local.
 * No-op se TURSO_DATABASE_URL não for file: ou se o remoto não mudou.
 */
export async function syncHistoricoFromRemote(opts?: {
  force?: boolean;
}): Promise<{ updated: boolean; reason: string; remoteAt?: string }> {
  const dbUrl = process.env.TURSO_DATABASE_URL?.trim();
  if (!dbUrl?.startsWith('file:')) {
    return { updated: false, reason: 'nao-local-file' };
  }

  const now = Date.now();
  if (!opts?.force && now - lastAttempt < MIN_INTERVAL_MS) {
    return { updated: false, reason: 'throttle' };
  }
  lastAttempt = now;

  const localPath = localPathFromTursoUrl(dbUrl);
  if (!localPath) return { updated: false, reason: 'path-invalido' };

  const remoteUrl = (
    process.env.HISTORICO_REMOTE_DB_URL?.trim() || DEFAULT_REMOTE
  ).replace(/\s+/g, '');

  let head: Response;
  try {
    head = await fetch(remoteUrl, { method: 'HEAD', redirect: 'follow' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { updated: false, reason: `head-falhou:${msg}` };
  }

  if (!head.ok) {
    return { updated: false, reason: `remoto-http-${head.status}` };
  }

  const remoteLen = Number(head.headers.get('content-length') || 0);
  const remoteEtag = head.headers.get('etag');
  const remoteLastMod = head.headers.get('last-modified');
  const remoteAt = remoteLastMod
    ? new Date(remoteLastMod).toISOString()
    : undefined;

  const metaPath = `${localPath}.remote-meta.json`;
  let prev: { etag?: string; lastModified?: string; size?: number } = {};
  if (fs.existsSync(metaPath)) {
    try {
      prev = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as typeof prev;
    } catch {
      prev = {};
    }
  }

  const localExists = fs.existsSync(localPath);
  const localSize = localExists ? fs.statSync(localPath).size : 0;
  const unchanged =
    localExists &&
    ((remoteEtag && prev.etag === remoteEtag) ||
      (remoteLastMod && prev.lastModified === remoteLastMod) ||
      (remoteLen > 0 && remoteLen === localSize && prev.size === remoteLen));

  if (unchanged && !opts?.force) {
    lastSuccessIso = remoteAt ?? lastSuccessIso;
    return { updated: false, reason: 'ja-atualizado', remoteAt };
  }

  let body: Response;
  try {
    body = await fetch(remoteUrl, { redirect: 'follow' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { updated: false, reason: `get-falhou:${msg}` };
  }
  if (!body.ok) {
    return { updated: false, reason: `get-http-${body.status}` };
  }

  const buf = Buffer.from(await body.arrayBuffer());
  if (buf.byteLength < 100) {
    return { updated: false, reason: 'arquivo-remoto-suspeito' };
  }

  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  const tmp = `${localPath}.download`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, localPath);
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        etag: remoteEtag,
        lastModified: remoteLastMod,
        size: buf.byteLength,
        syncedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    'utf8'
  );

  lastSuccessIso = remoteAt ?? new Date().toISOString();
  console.log(
    `[historico-sync] Atualizado ${localPath} (${buf.byteLength} bytes) de ${remoteUrl}`
  );
  return { updated: true, reason: 'baixado', remoteAt: lastSuccessIso };
}
