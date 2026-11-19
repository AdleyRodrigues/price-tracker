import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'AdleyRodrigues/price-tracker';
const BRANCH = 'historico-data';
const FILE = 'historico.db';

const MIN_INTERVAL_MS = 60_000;

let lastAttempt = 0;
let lastSuccessIso: string | null = null;

function localPathFromTursoUrl(url: string): string | null {
  if (!url.startsWith('file:')) return null;
  const raw = url.slice('file:'.length);
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

async function latestCommitSha(): Promise<{ sha: string; date?: string } | null> {
  const api =
    process.env.HISTORICO_REMOTE_COMMIT_API?.trim() ||
    `https://api.github.com/repos/${REPO}/commits/${BRANCH}`;
  const res = await fetch(api, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'lg-price-tracker-dashboard',
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    sha?: string;
    commit?: { committer?: { date?: string } };
  };
  if (!json.sha) return null;
  return { sha: json.sha, date: json.commit?.committer?.date };
}

/**
 * Baixa historico.db da branch historico-data (Actions) para o SQLite local.
 * Usa o SHA do commit (não o raw da branch) para evitar cache stale do CDN.
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

  let commit: { sha: string; date?: string } | null = null;
  try {
    commit = await latestCommitSha();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { updated: false, reason: `commit-api:${msg}` };
  }
  if (!commit) return { updated: false, reason: 'commit-nao-encontrado' };

  const metaPath = `${localPath}.remote-meta.json`;
  let prev: { sha?: string } = {};
  if (fs.existsSync(metaPath)) {
    try {
      prev = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as typeof prev;
    } catch {
      prev = {};
    }
  }

  if (!opts?.force && prev.sha === commit.sha && fs.existsSync(localPath)) {
    lastSuccessIso = commit.date ?? lastSuccessIso;
    return { updated: false, reason: 'ja-atualizado', remoteAt: commit.date };
  }

  const remoteUrl =
    process.env.HISTORICO_REMOTE_DB_URL?.trim() ||
    `https://raw.githubusercontent.com/${REPO}/${commit.sha}/${FILE}`;

  let body: Response;
  try {
    body = await fetch(remoteUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'lg-price-tracker-dashboard', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { updated: false, reason: `get-falhou:${msg}` };
  }
  if (!body.ok) {
    return { updated: false, reason: `get-http-${body.status}` };
  }

  const buf = Buffer.from(await body.arrayBuffer());
  // SQLite header: "SQLite format 3\0"
  if (buf.byteLength < 100 || buf.subarray(0, 16).toString('utf8') !== 'SQLite format 3\u0000') {
    return { updated: false, reason: 'arquivo-remoto-invalido' };
  }

  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  const tmp = `${localPath}.download`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, localPath);
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        sha: commit.sha,
        syncedAt: new Date().toISOString(),
        commitDate: commit.date,
        size: buf.byteLength,
        source: remoteUrl,
      },
      null,
      2
    ),
    'utf8'
  );

  lastSuccessIso = commit.date ?? new Date().toISOString();
  console.log(
    `[historico-sync] Atualizado ${localPath} (${buf.byteLength} bytes) @ ${commit.sha.slice(0, 7)}`
  );
  return { updated: true, reason: 'baixado', remoteAt: lastSuccessIso };
}
