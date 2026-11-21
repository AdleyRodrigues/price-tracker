/**
 * Copia price_snapshots de um SQLite local (file:) para Turso Cloud (libsql://).
 *
 * Uso:
 *   TURSO_SOURCE_URL=file:./data/historico.db \
 *   TURSO_DATABASE_URL=libsql://... \
 *   TURSO_AUTH_TOKEN=... \
 *   pnpm exec ts-node scripts/migrate-historico-to-turso.ts
 *
 * Se TURSO_SOURCE_URL omitido, usa file:./data/historico.db (relativo à raiz).
 */
import { createClient, type Client, type InArgs } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

const BATCH = 100;

function sourceClient(): Client {
  const raw =
    process.env.TURSO_SOURCE_URL?.trim() ||
    `file:${path.resolve(process.cwd(), 'data/historico.db')}`;
  if (!raw.startsWith('file:')) {
    throw new Error('TURSO_SOURCE_URL deve ser file:...');
  }
  const filePath = raw.slice('file:'.length);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo fonte não encontrado: ${filePath}`);
  }
  return createClient({ url: raw });
}

function destClient(): Client {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const token = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || url.startsWith('file:')) {
    throw new Error('TURSO_DATABASE_URL deve ser libsql://... (destino Turso)');
  }
  if (!token) throw new Error('TURSO_AUTH_TOKEN ausente');
  return createClient({ url, authToken: token });
}

async function ensureSchema(dest: Client): Promise<void> {
  const sqlPath = path.resolve(process.cwd(), 'sql/001_historico.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) =>
      s
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter((s) => s.length > 0);
  for (const statement of statements) {
    await dest.execute(statement);
  }
}

async function main(): Promise<void> {
  const src = sourceClient();
  const dest = destClient();

  try {
    await ensureSchema(dest);

    const countSrc = await src.execute(
      'SELECT COUNT(*) AS n, MAX(coletado_em) AS max_em FROM price_snapshots'
    );
    const nSrc = Number(countSrc.rows[0]?.n ?? 0);
    const maxSrc = String(countSrc.rows[0]?.max_em ?? '');
    console.log(`[migrate] fonte: ${nSrc} rows, max=${maxSrc}`);

    const existing = await dest.execute('SELECT COUNT(*) AS n FROM price_snapshots');
    const nDest = Number(existing.rows[0]?.n ?? 0);
    if (nDest > 0) {
      console.log(`[migrate] destino já tem ${nDest} rows — abortando (evita duplicar).`);
      console.log('[migrate] Esvazie o destino ou use um DB novo.');
      process.exitCode = 2;
      return;
    }

    let offset = 0;
    let copied = 0;
    for (; ;) {
      const page = await src.execute({
        sql: `SELECT modulo, produto_chave, loja, titulo, preco_avista, preco_total,
                     frete, url, fonte_id, coletado_em
              FROM price_snapshots
              ORDER BY id
              LIMIT ? OFFSET ?`,
        args: [BATCH, offset],
      });
      if (page.rows.length === 0) break;

      const statements = page.rows.map((r) => ({
        sql: `INSERT INTO price_snapshots (
            modulo, produto_chave, loja, titulo,
            preco_avista, preco_total, frete, url, fonte_id, coletado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          r.modulo,
          r.produto_chave,
          r.loja,
          r.titulo,
          r.preco_avista,
          r.preco_total,
          r.frete,
          r.url,
          r.fonte_id ?? null,
          r.coletado_em,
        ] as InArgs,
      }));
      await dest.batch(statements, 'write');
      copied += page.rows.length;
      offset += page.rows.length;
      console.log(`[migrate] copiados ${copied}/${nSrc}`);
    }

    const countDest = await dest.execute(
      'SELECT COUNT(*) AS n, MAX(coletado_em) AS max_em FROM price_snapshots'
    );
    console.log(
      `[migrate] ok destino: ${countDest.rows[0]?.n} rows, max=${countDest.rows[0]?.max_em}`
    );
  } finally {
    src.close();
    dest.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
