/**
 * Auditoria/correção: snapshots Amazon notebooks com cupom inventado
 * (FIRETVHD25, "25% OFF", "CUPOM") ou preço artificial ~75% da lista no mesmo ASIN
 * **somente quando a tag indica desconto externo**.
 *
 * Uso:
 *   pnpm exec ts-node scripts/audit-fix-cupons-inventados.ts
 *   pnpm exec ts-node scripts/audit-fix-cupons-inventados.ts --apply
 */
import { createClient } from '@libsql/client';
import { config } from 'dotenv';

config();

const APPLY = process.argv.includes('--apply');

const TAGS_INVENTADAS =
  /^FIRETV|FIRETVHD25|25%\s*OFF|CUPOM$/i;

type Row = {
  id: number;
  produto_chave: string;
  loja: string;
  titulo: string;
  preco_avista: number;
  url: string;
  cupom_tag: string | null;
  cupom_desconto: number | null;
  coletado_em: string;
};

function asinDeUrl(url: string): string | null {
  const m = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  return m ? m[1].toUpperCase() : null;
}

function tagInventada(tag: string | null): boolean {
  if (!tag || !tag.trim()) return false;
  return TAGS_INVENTADAS.test(tag.trim());
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) throw new Error('TURSO_DATABASE_URL / TURSO_AUTH_TOKEN ausentes');

  const c = createClient({ url, authToken });

  const suspeitos = await c.execute(`
    SELECT id, produto_chave, loja, titulo, preco_avista, url,
           cupom_tag, cupom_desconto, coletado_em
    FROM price_snapshots
    WHERE modulo = 'notebooks'
      AND (
        lower(loja) LIKE '%amazon%'
        OR lower(coalesce(fonte_id,'')) = 'amazon'
        OR url LIKE '%amazon.com.br%'
      )
      AND cupom_tag IS NOT NULL
      AND trim(cupom_tag) != ''
    ORDER BY coletado_em DESC
    LIMIT 300
  `);

  const rows = (suspeitos.rows as unknown as Row[]).filter((r) => tagInventada(r.cupom_tag));
  console.log(`[audit] ${rows.length} snapshot(s) com tag inventada (FIRETV / 25% OFF / CUPOM)`);

  let corrigidos = 0;

  for (const r of rows) {
    const asin = asinDeUrl(r.url);
    let precoLista: number | null = null;

    if (asin) {
      const ref = await c.execute({
        sql: `SELECT preco_avista, cupom_tag FROM price_snapshots
              WHERE url LIKE ? AND modulo = 'notebooks'
                AND (
                  cupom_tag IS NULL OR trim(cupom_tag) = ''
                  OR upper(cupom_tag) GLOB '[0-9]*OFF'
                )
                AND preco_avista > 4000
              ORDER BY
                CASE WHEN upper(coalesce(cupom_tag,'')) GLOB '[0-9]*OFF' THEN 0 ELSE 1 END,
                coletado_em DESC
              LIMIT 5`,
        args: [`%${asin}%`],
      });

      for (const cand of ref.rows as unknown as { preco_avista: number; cupom_tag: string | null }[]) {
        const p = Number(cand.preco_avista);
        const tag = (cand.cupom_tag || '').toUpperCase();
        // Preferir snapshot com 170OFF já corrigido; senão o maior preço “limpo”
        if (/^\d+OFF$/.test(tag) && p > 4000) {
          precoLista = p + (Number(tag.replace('OFF', '')) || 0);
          break;
        }
        if (!precoLista || p > precoLista) precoLista = p;
      }
    }

    const atual = Number(r.preco_avista);
    let novoPreco = atual;
    let novaTag: string | null = null;
    let novoDesconto: number | null = null;

    if (precoLista && atual <= precoLista * 0.82) {
      // Reverte 25% inventado → lista − cupom PDP típico 170OFF (se couber)
      const com170 = Math.round((precoLista - 170) * 100) / 100;
      if (com170 > 4000 && Math.abs(atual - precoLista * 0.75) / (precoLista * 0.75) < 0.08) {
        novoPreco = com170;
        novaTag = '170OFF';
        novoDesconto = 170;
      } else {
        novoPreco = Math.round(precoLista * 100) / 100;
        novaTag = null;
        novoDesconto = null;
      }
    } else {
      // Só limpa a tag mentirosa; mantém preço (já pode estar na lista)
      novaTag = null;
      novoDesconto = null;
    }

    console.log(
      `[audit] id=${r.id} ${r.produto_chave} tag=${r.cupom_tag} ${atual} → ${novoPreco}` +
      (novaTag ? ` [${novaTag}]` : ' [sem cupom]') +
      (APPLY ? ' APPLY' : ' dry-run')
    );

    if (APPLY) {
      await c.execute({
        sql: `UPDATE price_snapshots
              SET preco_avista = ?,
                  preco_total = ?,
                  cupom_tag = ?,
                  cupom_desconto = ?
              WHERE id = ?`,
        args: [novoPreco, novoPreco, novaTag, novoDesconto, r.id],
      });
      corrigidos += 1;
    }
  }

  // Nitro residual: faixa 5000–5600 no ASIN B0HP3VN4NW sem tag ou com tag inventada
  const nitro = await c.execute(`
    SELECT id, produto_chave, preco_avista, cupom_tag, url
    FROM price_snapshots
    WHERE modulo = 'notebooks'
      AND url LIKE '%B0HP3VN4NW%'
      AND preco_avista BETWEEN 5000 AND 5600
    ORDER BY coletado_em DESC
  `);

  for (const r of nitro.rows as unknown as Row[]) {
    if (r.cupom_tag && !tagInventada(r.cupom_tag) && String(r.cupom_tag).toUpperCase() === '170OFF') {
      continue;
    }
    const alvo = 6781.15;
    console.log(
      `[audit] nitro residual id=${r.id} ${r.preco_avista} → ${alvo} [170OFF]` +
      (APPLY ? ' APPLY' : ' dry-run')
    );
    if (APPLY) {
      await c.execute({
        sql: `UPDATE price_snapshots
              SET preco_avista = ?, preco_total = ?, cupom_tag = ?, cupom_desconto = ?
              WHERE id = ?`,
        args: [alvo, alvo, '170OFF', 170, r.id],
      });
      corrigidos += 1;
    }
  }

  console.log(
    APPLY
      ? `[audit] corrigidos: ${corrigidos}`
      : `[audit] dry-run — rode com --apply para gravar (${rows.length} tags + nitro residual)`
  );

  await c.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
