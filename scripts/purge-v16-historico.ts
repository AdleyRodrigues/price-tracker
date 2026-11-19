import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@libsql/client';

async function main() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) throw new Error('TURSO_DATABASE_URL ausente');
  const client = url.startsWith('file:')
    ? createClient({ url })
    : createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  const before = await client.execute(
    `SELECT COUNT(*) AS n FROM price_snapshots
     WHERE modulo = 'notebooks' AND (
       produto_chave LIKE 'v16%'
       OR lower(titulo) LIKE '% v16 %'
       OR lower(titulo) LIKE '%v16,%'
       OR lower(titulo) LIKE 'notebook asus gaming v16%'
       OR lower(titulo) LIKE '% rp213 %'
       OR lower(titulo) LIKE '%v3607%'
     )`
  );
  console.log(`[purge] candidatos=${before.rows[0]?.n}`);

  await client.execute(
    `DELETE FROM price_snapshots
     WHERE modulo = 'notebooks' AND (
       produto_chave LIKE 'v16%'
       OR lower(titulo) LIKE '% v16 %'
       OR lower(titulo) LIKE '%v16,%'
       OR lower(titulo) LIKE 'notebook asus gaming v16%'
       OR lower(titulo) LIKE '%gaming v16%'
       OR lower(titulo) LIKE '%gamer v16%'
       OR lower(titulo) LIKE '% rp213 %'
       OR lower(titulo) LIKE '%v3607%'
     )`
  );

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
