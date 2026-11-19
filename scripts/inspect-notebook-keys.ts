import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@libsql/client';

async function main() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) throw new Error('TURSO_DATABASE_URL ausente');
  const client = url.startsWith('file:')
    ? createClient({ url })
    : createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  const by = await client.execute(
    `SELECT produto_chave, COUNT(*) AS n
     FROM price_snapshots WHERE modulo = 'notebooks'
     GROUP BY produto_chave ORDER BY n DESC`
  );
  for (const r of by.rows) console.log(`${r.n}\t${r.produto_chave}`);

  console.log('\n--- títulos sem PN (amostra) ---');
  const s = await client.execute(
    `SELECT produto_chave, titulo, COUNT(*) AS n
     FROM price_snapshots
     WHERE modulo = 'notebooks' AND produto_chave NOT GLOB '[a-z][a-z][0-9][0-9][0-9]*'
     GROUP BY produto_chave, titulo
     ORDER BY n DESC
     LIMIT 15`
  );
  for (const r of s.rows) {
    console.log(`${r.n}\t${r.produto_chave}\t${String(r.titulo).slice(0, 100)}`);
  }
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
