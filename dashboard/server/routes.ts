import { Hono } from 'hono';
import { getDb, isDbConfigured } from './db';
import { labelProduto } from './labels';

export type ProdutoResumo = {
  produtoChave: string;
  label: string;
  modulo: string;
  menorPreco: number | null;
  lojaMenorPreco: string | null;
  urlMenorPreco: string | null;
  coletadoEm: string | null;
  variacao24h: number | null;
  variacao7d: number | null;
  totalSnapshots: number;
};

export type SnapshotRow = {
  id: number;
  modulo: string;
  produtoChave: string;
  loja: string;
  titulo: string;
  precoAvista: number;
  precoTotal: number;
  frete: number;
  url: string;
  fonteId: string | null;
  coletadoEm: string;
};

function parseModulo(raw: string | undefined): string {
  const m = (raw ?? 'celular').trim().toLowerCase();
  return m || 'celular';
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/** Menor preço na coleta mais recente com timestamp <= limiteIso (baseline para variação). */
async function menorPrecoAte(
  modulo: string,
  produto: string,
  limiteIso: string
): Promise<number | null> {
  const db = getDb();
  const coleta = await db.execute({
    sql: `SELECT MAX(coletado_em) AS max_em
          FROM price_snapshots
          WHERE modulo = ? AND produto_chave = ? AND coletado_em <= ?`,
    args: [modulo, produto, limiteIso],
  });
  const maxEm = coleta.rows[0]?.max_em;
  if (maxEm == null) return null;

  const res = await db.execute({
    sql: `SELECT MIN(preco_avista) AS min_preco
          FROM price_snapshots
          WHERE modulo = ? AND produto_chave = ? AND coletado_em = ?`,
    args: [modulo, produto, String(maxEm)],
  });
  const val = res.rows[0]?.min_preco;
  return typeof val === 'number' ? val : val != null ? Number(val) : null;
}

export const api = new Hono();

api.get('/health', (c) =>
  c.json({
    ok: true,
    dbConfigured: isDbConfigured(),
  })
);

api.get('/produtos', async (c) => {
  if (!isDbConfigured()) {
    return c.json({ produtos: [], warning: 'Turso não configurado' });
  }

  const modulo = parseModulo(c.req.query('modulo'));
  const db = getDb();

  const produtosRes = await db.execute({
    sql: `SELECT produto_chave, COUNT(*) AS total
          FROM price_snapshots
          WHERE modulo = ?
          GROUP BY produto_chave
          ORDER BY produto_chave ASC`,
    args: [modulo],
  });

  const produtos: ProdutoResumo[] = [];

  for (const row of produtosRes.rows) {
    const produtoChave = String(row.produto_chave);
    const totalSnapshots = Number(row.total ?? 0);

    // Menor preço na coleta mais recente (última janela de run)
    const ultimaColeta = await db.execute({
      sql: `SELECT MAX(coletado_em) AS max_em
            FROM price_snapshots
            WHERE modulo = ? AND produto_chave = ?`,
      args: [modulo, produtoChave],
    });
    const maxEm = ultimaColeta.rows[0]?.max_em
      ? String(ultimaColeta.rows[0].max_em)
      : null;

    let menorPreco: number | null = null;
    let lojaMenorPreco: string | null = null;
    let urlMenorPreco: string | null = null;
    let coletadoEm: string | null = maxEm;

    if (maxEm) {
      const melhorNaUltima = await db.execute({
        sql: `SELECT preco_avista, loja, url, coletado_em
              FROM price_snapshots
              WHERE modulo = ? AND produto_chave = ? AND coletado_em = ?
              ORDER BY preco_avista ASC
              LIMIT 1`,
        args: [modulo, produtoChave, maxEm],
      });
      const best = melhorNaUltima.rows[0];
      if (best) {
        menorPreco = Number(best.preco_avista);
        lojaMenorPreco = String(best.loja);
        urlMenorPreco = String(best.url);
        coletadoEm = String(best.coletado_em);
      }
    }

    const base24h = await menorPrecoAte(modulo, produtoChave, isoDaysAgo(1));
    const base7d = await menorPrecoAte(modulo, produtoChave, isoDaysAgo(7));

    const variacao24h =
      menorPreco != null && base24h != null && base24h > 0
        ? ((menorPreco - base24h) / base24h) * 100
        : null;
    const variacao7d =
      menorPreco != null && base7d != null && base7d > 0
        ? ((menorPreco - base7d) / base7d) * 100
        : null;

    produtos.push({
      produtoChave,
      label: labelProduto(produtoChave),
      modulo,
      menorPreco,
      lojaMenorPreco,
      urlMenorPreco,
      coletadoEm,
      variacao24h,
      variacao7d,
      totalSnapshots,
    });
  }

  return c.json({ produtos });
});

api.get('/historico', async (c) => {
  if (!isDbConfigured()) {
    return c.json({ snapshots: [], serie: [], warning: 'Turso não configurado' });
  }

  const modulo = parseModulo(c.req.query('modulo'));
  const produto = c.req.query('produto')?.trim();
  const loja = c.req.query('loja')?.trim();
  const de = c.req.query('de')?.trim() || isoDaysAgo(30);
  const ate = c.req.query('ate')?.trim() || new Date().toISOString();

  if (!produto) {
    return c.json({ error: 'Query param "produto" é obrigatório' }, 400);
  }

  const args: Array<string | number> = [modulo, produto, de, ate];
  let lojaClause = '';
  if (loja) {
    lojaClause = ' AND loja = ?';
    args.push(loja);
  }

  const db = getDb();
  const res = await db.execute({
    sql: `SELECT id, modulo, produto_chave, loja, titulo,
                 preco_avista, preco_total, frete, url, fonte_id, coletado_em
          FROM price_snapshots
          WHERE modulo = ? AND produto_chave = ?
            AND coletado_em >= ? AND coletado_em <= ?
            ${lojaClause}
          ORDER BY coletado_em ASC, preco_avista ASC
          LIMIT 5000`,
    args,
  });

  const snapshots: SnapshotRow[] = res.rows.map((row) => ({
    id: Number(row.id),
    modulo: String(row.modulo),
    produtoChave: String(row.produto_chave),
    loja: String(row.loja),
    titulo: String(row.titulo),
    precoAvista: Number(row.preco_avista),
    precoTotal: Number(row.preco_total),
    frete: Number(row.frete),
    url: String(row.url),
    fonteId: row.fonte_id != null ? String(row.fonte_id) : null,
    coletadoEm: String(row.coletado_em),
  }));

  // Série: menor preço por timestamp de coleta (bom para gráfico)
  const byTime = new Map<string, { coletadoEm: string; preco: number; loja: string }>();
  for (const s of snapshots) {
    const cur = byTime.get(s.coletadoEm);
    if (!cur || s.precoAvista < cur.preco) {
      byTime.set(s.coletadoEm, {
        coletadoEm: s.coletadoEm,
        preco: s.precoAvista,
        loja: s.loja,
      });
    }
  }

  const serie = [...byTime.values()].sort((a, b) =>
    a.coletadoEm.localeCompare(b.coletadoEm)
  );

  // Série por loja (para gráfico multi-linha)
  const seriePorLojaMap = new Map<string, Array<{ coletadoEm: string; preco: number }>>();
  for (const s of snapshots) {
    const list = seriePorLojaMap.get(s.loja) ?? [];
    const existing = list.find((p) => p.coletadoEm === s.coletadoEm);
    if (!existing) {
      list.push({ coletadoEm: s.coletadoEm, preco: s.precoAvista });
    } else if (s.precoAvista < existing.preco) {
      existing.preco = s.precoAvista;
    }
    seriePorLojaMap.set(s.loja, list);
  }

  const seriePorLoja = [...seriePorLojaMap.entries()].map(([lojaNome, pontos]) => ({
    loja: lojaNome,
    pontos: pontos.sort((a, b) => a.coletadoEm.localeCompare(b.coletadoEm)),
  }));

  return c.json({
    produto,
    label: labelProduto(produto),
    modulo,
    snapshots: [...snapshots].reverse(),
    serie,
    seriePorLoja,
  });
});

api.get('/lojas', async (c) => {
  if (!isDbConfigured()) {
    return c.json({ lojas: [], warning: 'Turso não configurado' });
  }

  const modulo = parseModulo(c.req.query('modulo'));
  const produto = c.req.query('produto')?.trim();
  const db = getDb();

  const args: string[] = [modulo];
  let produtoClause = '';
  if (produto) {
    produtoClause = ' AND produto_chave = ?';
    args.push(produto);
  }

  const res = await db.execute({
    sql: `SELECT DISTINCT loja
          FROM price_snapshots
          WHERE modulo = ?${produtoClause}
          ORDER BY loja ASC`,
    args,
  });

  return c.json({
    lojas: res.rows.map((r) => String(r.loja)),
  });
});
