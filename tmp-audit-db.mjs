import { createClient } from '@libsql/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(root, 'data/historico.db').replace(/\\/g, '/');
const client = createClient({ url: `file:${dbPath}` });

const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
console.log('tables', tables.rows.map((r) => r.name));

for (const t of tables.rows) {
  const cols = await client.execute(`PRAGMA table_info(${t.name})`);
  console.log(t.name, cols.rows.map((c) => c.name).join(','));
}

const rows = await client.execute(`
  SELECT produto_chave,
         MIN(preco) as min_preco,
         MAX(titulo) as titulo_ex,
         COUNT(*) as n
  FROM snapshots
  WHERE produto_chave IS NOT NULL
  GROUP BY produto_chave
  ORDER BY min_preco ASC
`);

console.log('\n=== produtos ===');
for (const r of rows.rows) {
  console.log(`${r.produto_chave}\tR$ ${r.min_preco}\tn=${r.n}\t${String(r.titulo_ex || '').slice(0, 100)}`);
}
