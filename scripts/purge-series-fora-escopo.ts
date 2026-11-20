/**
 * Remove snapshots de notebooks fora do escopo (G16, M16, V16, etc.).
 */
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@libsql/client';

async function main() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) throw new Error('TURSO_DATABASE_URL ausente');
  const client = url.startsWith('file:')
    ? createClient({ url })
    : createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  const where = `
    modulo = 'notebooks' AND (
      produto_chave LIKE 'g16%'
      OR produto_chave LIKE 'm16%'
      OR produto_chave LIKE 'v16%'
      OR produto_chave LIKE 'g614%'
      OR produto_chave LIKE 'g634%'
      OR produto_chave LIKE 'gu604%'
      OR produto_chave LIKE 'gu605%'
      OR lower(titulo) LIKE '% g16 %'
      OR lower(titulo) LIKE '%g16,%'
      OR lower(titulo) LIKE '% m16 %'
      OR lower(titulo) LIKE '%strix g16%'
      OR lower(titulo) LIKE '%gaming g16%'
      OR lower(titulo) LIKE '%gaming m16%'
      OR lower(titulo) LIKE '% v16 %'
      OR lower(titulo) LIKE '%v16,%'
      OR lower(titulo) LIKE '%gaming v16%'
      OR lower(titulo) LIKE '%gamer v16%'
      OR lower(titulo) LIKE '% rp213 %'
      OR lower(titulo) LIKE '%v3607%'
    )
  `;

  const before = await client.execute(
    `SELECT COUNT(*) AS n FROM price_snapshots WHERE ${where}`
  );
  console.log(`[purge] candidatos=${before.rows[0]?.n}`);

  await client.execute(`DELETE FROM price_snapshots WHERE ${where}`);

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
