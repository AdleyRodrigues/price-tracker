/**
 * Libera portas locais antes do `pnpm dev`, mas só mata processos
 * claramente deste repo (lg-price-tracker / dashboard).
 * Uso: node scripts/free-ports.mjs 5173 8787
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ports = process.argv
  .slice(2)
  .map((p) => Number(p))
  .filter((p) => Number.isInteger(p) && p > 0);

if (ports.length === 0) {
  console.error('[free-ports] informe ao menos uma porta');
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const dashboardRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(dashboardRoot, '..');

function norm(p) {
  return path.resolve(p).replace(/\\/g, '/').toLowerCase();
}

const markers = [
  norm(repoRoot),
  norm(dashboardRoot),
  'lg-price-tracker',
  'price-tracker/dashboard',
  'price-tracker\\dashboard',
];

function listeningPids(port) {
  if (process.platform === 'win32') {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!/LISTENING/i.test(line)) continue;
      const m = line.match(new RegExp(`:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`, 'i'));
      if (m) pids.add(m[1]);
    }
    return [...pids];
  }

  try {
    const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function commandLineFor(pid) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(
        `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"ProcessId = ${pid}\\").CommandLine"`,
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
      );
      return out.trim();
    }
    return execSync(`ps -p ${pid} -o args=`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function belongsToThisProject(cmd) {
  if (!cmd) return false;
  const hay = cmd.replace(/\\/g, '/').toLowerCase();
  return markers.some((m) => hay.includes(m.replace(/\\/g, '/')));
}

function killPid(pid) {
  if (process.platform === 'win32') {
    execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    return;
  }
  execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
}

for (const port of ports) {
  const pids = listeningPids(port);
  if (pids.length === 0) {
    console.log(`[free-ports] :${port} livre`);
    continue;
  }

  for (const pid of pids) {
    if (pid === '0' || pid === String(process.pid)) continue;
    const cmd = commandLineFor(pid);
    if (!belongsToThisProject(cmd)) {
      console.log(
        `[free-ports] :${port} ocupada pelo PID ${pid} (outro projeto) — mantida`
      );
      continue;
    }
    try {
      killPid(pid);
      console.log(`[free-ports] :${port} — encerrou PID ${pid} (deste repo)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[free-ports] :${port} — falha ao matar PID ${pid}: ${msg}`);
    }
  }
}
