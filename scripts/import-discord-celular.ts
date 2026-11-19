/**
 * One-shot: importa export textual do Discord ("Celular Promo.txt") para price_snapshots.
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { identificarProdutoChaveCelular } from '../src/domain/filtros-celular';

const ARQUIVO = path.resolve(process.cwd(), 'Celular Promo.txt');
const DB_PATH = path.resolve(process.cwd(), 'data', 'historico.db');
const MIGRATION = path.resolve(process.cwd(), 'sql', '001_historico.sql');

type Snapshot = {
  modulo: 'celular';
  produtoChave: string;
  loja: string;
  titulo: string;
  precoAvista: number;
  precoTotal: number;
  frete: number;
  url: string;
  fonteId: string;
  coletadoEm: string;
};

function parsePrecoBR(raw: string): number {
  return Number(raw.replace(/\./g, '').replace(',', '.'));
}

/** Converte data/hora BR (UTC-3) para ISO UTC. */
function brToIso(y: number, m: number, d: number, hh: number, mm: number, ss = 0): string {
  const utc = Date.UTC(y, m - 1, d, hh + 3, mm, ss);
  return new Date(utc).toISOString();
}

function parseDataHoraBR(text: string, refHoje: Date): string | null {
  const abs =
    text.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})(?::(\d{2}))?/) ||
    text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (abs) {
    return brToIso(
      Number(abs[3]),
      Number(abs[2]),
      Number(abs[1]),
      Number(abs[4]),
      Number(abs[5]),
      abs[6] ? Number(abs[6]) : 0
    );
  }

  const hoje = text.match(/Hoje\s+às\s+(\d{1,2}):(\d{2})/i);
  if (hoje) {
    return brToIso(
      refHoje.getFullYear(),
      refHoje.getMonth() + 1,
      refHoje.getDate(),
      Number(hoje[1]),
      Number(hoje[2])
    );
  }

  const ontem = text.match(/Ontem\s+às\s+(\d{1,2}):(\d{2})/i);
  if (ontem) {
    const d = new Date(refHoje);
    d.setDate(d.getDate() - 1);
    return brToIso(d.getFullYear(), d.getMonth() + 1, d.getDate(), Number(ontem[1]), Number(ontem[2]));
  }

  const soHora = text.match(/^\s*[—-]\s*(\d{1,2}):(\d{2})\s*$/);
  if (soHora) {
    return brToIso(
      refHoje.getFullYear(),
      refHoje.getMonth() + 1,
      refHoje.getDate(),
      Number(soHora[1]),
      Number(soHora[2])
    );
  }

  return null;
}

function extrairSnapshotsComFooter(texto: string, refHoje: Date): Snapshot[] {
  const lines = texto.split(/\r?\n/);
  const blocks: Array<{ headerRaw: string; body: string[] }> = [];
  let cur: { headerRaw: string; body: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'Celular Promo' && lines[i + 1]?.trim() === 'APP') {
      const headerLine = lines[i + 2] || '';
      const headerRaw = headerLine.replace(/^\s*[—-]\s*/, '').trim();
      cur = { headerRaw, body: [] };
      blocks.push(cur);
      i += 2;
      continue;
    }
    if (cur) cur.body.push(lines[i]);
  }

  const all: Snapshot[] = [];

  for (const block of blocks) {
    let coletadoEm =
      parseDataHoraBR(block.headerRaw, refHoje) ||
      parseDataHoraBR(`— ${block.headerRaw}`, refHoje);

    // Footers no corpo (podem haver 2 em mensagens split)
    const footerLines = block.body.filter((l) => /^CEP\s+\d/i.test(l.trim()));
    const bodyText = block.body.join('\n');

    // Se há um único footer com data absoluta, usa ele para o bloco inteiro
    for (const fl of footerLines) {
      const iso = parseDataHoraBR(fl, refHoje);
      if (iso && /\d{2}\/\d{2}\/\d{4}/.test(fl)) {
        coletadoEm = iso;
        break;
      }
    }
    if (!coletadoEm) {
      for (const fl of footerLines) {
        const iso = parseDataHoraBR(fl, refHoje);
        if (iso) {
          coletadoEm = iso;
          break;
        }
      }
    }
    if (!coletadoEm) continue;

    // Subdivide por footer quando a mensagem tem 2 pódios (Poco + Xiaomi)
    const segments: Array<{ iso: string; text: string }> = [];
    let buf: string[] = [];
    let segIso = coletadoEm;

    for (const line of block.body) {
      buf.push(line);
      if (/^CEP\s+\d/i.test(line.trim())) {
        const iso = parseDataHoraBR(line, refHoje) || segIso;
        segments.push({ iso, text: buf.join('\n') });
        buf = [];
        segIso = iso;
      }
    }
    if (buf.length) segments.push({ iso: coletadoEm, text: buf.join('\n') });
    if (segments.length === 0) segments.push({ iso: coletadoEm, text: bodyText });

    for (const seg of segments) {
      const rankRe = /^[🥇🥈🥉🎖️]\s*\d+[ºo]?\s*[—-]\s*(.+)\s*$/u;
      const precoRe = /À vista:\s*R\$\s*([\d.]+,\d{2}).*?Total:\s*R\$\s*([\d.]+,\d{2})/i;
      const segLines = seg.text.split(/\r?\n/);
      let loja: string | null = null;
      let titulo: string | null = null;

      for (const raw of segLines) {
        const line = raw.trim();
        const rank = line.match(rankRe);
        if (rank) {
          loja = rank[1].trim();
          titulo = null;
          continue;
        }
        if (
          loja &&
          !titulo &&
          line &&
          !line.startsWith('💵') &&
          !line.startsWith('💳') &&
          !line.startsWith('🔗') &&
          !line.startsWith('📱') &&
          !/^CEP\s+\d/i.test(line) &&
          !line.startsWith('Melhor oferta') &&
          !line.startsWith('Comparativo') &&
          !line.startsWith('Modelos:') &&
          !line.startsWith('📊') &&
          !line.startsWith('@')
        ) {
          titulo = line;
          continue;
        }
        const preco = line.match(precoRe);
        if (preco && loja) {
          const tituloFinal = titulo || loja;
          const chave = identificarProdutoChaveCelular(tituloFinal);
          if (chave) {
            const avista = parsePrecoBR(preco[1]);
            const total = parsePrecoBR(preco[2]);
            all.push({
              modulo: 'celular',
              produtoChave: chave,
              loja,
              titulo: tituloFinal,
              precoAvista: avista,
              precoTotal: total,
              frete: Math.max(0, Math.round((total - avista) * 100) / 100),
              url: 'import://discord/celular-promo',
              fonteId: 'discord-import',
              coletadoEm: seg.iso,
            });
          }
          loja = null;
          titulo = null;
        }
      }
    }
  }

  return all;
}

async function main(): Promise<void> {
  if (!fs.existsSync(ARQUIVO)) {
    throw new Error(`Arquivo não encontrado: ${ARQUIVO}`);
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  // Prefer env; senão usa SQLite local
  let dbUrl = process.env.TURSO_DATABASE_URL?.trim();
  let authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!dbUrl) {
    dbUrl = `file:${DB_PATH.replace(/\\/g, '/')}`;
    process.env.TURSO_DATABASE_URL = dbUrl;
    console.log(`[import] TURSO ausente — usando SQLite local: ${dbUrl}`);
  }

  const client = dbUrl.startsWith('file:')
    ? createClient({ url: dbUrl })
    : createClient({ url: dbUrl, authToken });

  const migration = fs.readFileSync(MIGRATION, 'utf8');
  for (const stmt of migration
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)) {
    await client.execute(stmt);
  }

  const texto = fs.readFileSync(ARQUIVO, 'utf8');
  // Arquivo exportado em 18/11/2026 — ancora "Hoje"/"Ontem"
  const refHoje = new Date(2026, 10, 18, 12, 0, 0);
  const snaps = extrairSnapshotsComFooter(texto, refHoje);

  console.log(`[import] ${snaps.length} snapshots parseados`);

  // Dedup simples: modulo+produto+loja+preco+coletadoEm+titulo
  const seen = new Set<string>();
  const unicos = snaps.filter((s) => {
    const k = [s.produtoChave, s.loja, s.precoAvista, s.coletadoEm, s.titulo].join('|');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  console.log(`[import] ${unicos.length} únicos após dedupe`);

  const BATCH = 40;
  let gravados = 0;
  for (let i = 0; i < unicos.length; i += BATCH) {
    const lote = unicos.slice(i, i + BATCH);
    await client.batch(
      lote.map((s) => ({
        sql: `INSERT INTO price_snapshots (
            modulo, produto_chave, loja, titulo,
            preco_avista, preco_total, frete, url, fonte_id, coletado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          s.modulo,
          s.produtoChave,
          s.loja,
          s.titulo,
          s.precoAvista,
          s.precoTotal,
          s.frete,
          s.url,
          s.fonteId,
          s.coletadoEm,
        ],
      })),
      'write'
    );
    gravados += lote.length;
  }

  const count = await client.execute('SELECT COUNT(*) AS n FROM price_snapshots');
  console.log(`[import] gravados=${gravados}; total na tabela=${count.rows[0]?.n}`);

  // Resumo por produto
  const byProd = await client.execute(
    `SELECT produto_chave, COUNT(*) AS n, MIN(preco_avista) AS min_p, MAX(preco_avista) AS max_p
     FROM price_snapshots GROUP BY produto_chave ORDER BY produto_chave`
  );
  for (const row of byProd.rows) {
    console.log(
      `  - ${row.produto_chave}: ${row.n} snaps | min R$ ${row.min_p} | max R$ ${row.max_p}`
    );
  }

  client.close();

  // Garante .env apontando para o DB local se ainda não houver URL
  const envPath = path.resolve(process.cwd(), '.env');
  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (!/^TURSO_DATABASE_URL=/m.test(env)) {
    const fileUrl = `file:${DB_PATH.replace(/\\/g, '/')}`;
    env += `\n# Histórico local (substitua por Turso remoto quando quiser multi-device)\nTURSO_DATABASE_URL="${fileUrl}"\n`;
    fs.writeFileSync(envPath, env, 'utf8');
    console.log('[import] .env atualizado com TURSO_DATABASE_URL local');
  }

  // Remove o export do Discord
  fs.unlinkSync(ARQUIVO);
  console.log(`[import] removido: ${path.basename(ARQUIVO)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
