import { createClient } from '@libsql/client';
import os from 'node:os';
import path from 'node:path';

const p = path.join(os.tmpdir(), 'h-new.db').replace(/\\/g, '/');
const c = createClient({ url: `file:${p}` });

async function main() {
  const r = await c.execute(
    'SELECT COUNT(*) AS n, MAX(coletado_em) AS max_em FROM price_snapshots'
  );
  console.log('total', r.rows[0]);
  const m = await c.execute(
    'SELECT modulo, COUNT(*) AS n, MAX(coletado_em) AS max_em FROM price_snapshots GROUP BY modulo'
  );
  for (const row of m.rows) console.log(row);
  c.close();
}

main();
