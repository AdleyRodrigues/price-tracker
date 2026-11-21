import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'AdleyRodrigues/price-tracker';
const BRANCH = 'historico-data';
const FILE = 'historico.db';

const MIN_INTERVAL_MS = 30_000;

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
      'Cache-Control': 'no-cache',
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
 * Sempre pelo SHA do commit — raw da branch fica cacheado no CDN do GitHub
 * e a dash "congela" com dados velhos mesmo após o Actions publicar.
 */
function remoteDbUrlForSha(sha: string): string {
  const override = process.env.HISTORICO_REMOTE_DB_URL?.trim();
  // Só aceita override se já apontar para um commit (40 hex) — nunca a branch.
  if (override && /\/[0-9a-f]{40}\//i.test(override)) {
    return override.replace(/\/[0-9a-f]{40}\//i, `/${sha}/`);
  }
  return `https://raw.githubusercontent.com/${REPO}/${sha}/${FILE}`;
}

/** Substitui o SQLite no disco. No Windows o rename falha se o arquivo estiver aberto. */
function replaceDbFile(tmp: string, dest: string): void {
  try {
    fs.renameSync(tmp, dest);
    return;
  } catch {
    // Windows: dest pode existir e estar travado — tenta sobrescrever após close do client
  }
  try {
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    fs.renameSync(tmp, dest);
    return;
  } catch {
    fs.copyFileSync(tmp, dest);
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Baixa historico.db da branch historico-data (Actions) para o SQLite local.
 *
 * Defina HISTORICO_SKIP_REMOTE_SYNC=1 para NÃO sobrescrever o SQLite local
 * (útil após `pnpm start` / scrape local com Acer/Lenovo/Avell).
 *
 * `beforeReplace`: feche o client libSQL/SQLite antes de trocar o arquivo (obrigatório no Windows).
 */
export async function syncHistoricoFromRemote(opts?: {
  force?: boolean;
  beforeReplace?: () => void;
}): Promise<{ updated: boolean; reason: string; remoteAt?: string }> {
  const skip =
    /^(1|true|yes|on)$/i.test(process.env.HISTORICO_SKIP_REMOTE_SYNC?.trim() ?? '');
  if (skip) {
    return { updated: false, reason: 'skip-remote-sync' };
  }

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
  let prev: { sha?: string; source?: string } = {};
  if (fs.existsSync(metaPath)) {
    try {
      prev = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as typeof prev;
    } catch {
      prev = {};
    }
  }

  // Meta antiga baixada pela URL da branch (CDN) — força re-download mesmo com mesmo SHA.
  const metaSuspeita =
    typeof prev.source === 'string' &&
    /\/historico-data\/historico\.db/i.test(prev.source) &&
    !/\/[0-9a-f]{40}\//i.test(prev.source);

  if (
    !opts?.force &&
    !metaSuspeita &&
    prev.sha === commit.sha &&
    fs.existsSync(localPath)
  ) {
    lastSuccessIso = commit.date ?? lastSuccessIso;
    return { updated: false, reason: 'ja-atualizado', remoteAt: commit.date };
  }

  const remoteUrl = remoteDbUrlForSha(commit.sha);

  let body: Response;
  try {
    body = await fetch(remoteUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'lg-price-tracker-dashboard',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
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

  try {
    opts?.beforeReplace?.();
    replaceDbFile(tmp, localPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    return { updated: false, reason: `replace-falhou:${msg}` };
  }

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
    `[historico-sync] Atualizado ${localPath} (${buf.byteLength} bytes) @ ${commit.sha.slice(0, 7)} via SHA`
  );
  return { updated: true, reason: metaSuspeita ? 'rebaixado-cdn-stale' : 'baixado', remoteAt: lastSuccessIso };
}
