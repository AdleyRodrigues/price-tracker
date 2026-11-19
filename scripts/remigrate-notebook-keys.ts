/**
 * Reidentifica produto_chave de notebooks a partir do título (consolida fallbacks F16 → FX608*).
 */
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@libsql/client';
import { identificarProdutoChaveNotebook } from '../src/domain/filtros';

async function main() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) throw new Error('TURSO_DATABASE_URL ausente');
  const client = url.startsWith('file:')
    ? createClient({ url })
    : createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  const res = await client.execute(
    `SELECT id, titulo, produto_chave FROM price_snapshots WHERE modulo = 'notebooks'`
  );

  let changed = 0;
  let dropped = 0;
  const BATCH = 40;
  const updates: Array<{ id: number; chave: string }> = [];

  for (const row of res.rows) {
    const id = Number(row.id);
    const titulo = String(row.titulo ?? '');
    const atual = String(row.produto_chave);
    const nova = identificarProdutoChaveNotebook(titulo);
    if (!nova) {
      dropped += 1;
      continue;
    }
    if (nova !== atual) {
      updates.push({ id, chave: nova });
      changed += 1;
    }
  }

  for (let i = 0; i < updates.length; i += BATCH) {
    const lote = updates.slice(i, i + BATCH);
    await client.batch(
      lote.map((u) => ({
        sql: `UPDATE price_snapshots SET produto_chave = ? WHERE id = ?`,
        args: [u.chave, u.id],
      })),
      'write'
    );
  }

  console.log(`[remigrate] alterados=${changed}; sem chave=${dropped}; total=${res.rows.length}`);

  const by = await client.execute(
    `SELECT produto_chave, COUNT(*) AS n
     FROM price_snapshots WHERE modulo = 'notebooks'
     GROUP BY produto_chave ORDER BY n DESC`
  );
  for (const r of by.rows) console.log(`  ${r.n}\t${r.produto_chave}`);

  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
