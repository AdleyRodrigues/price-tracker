import { createClient, type Client, type InArgs } from '@libsql/client';
import { identificarProdutoChaveCelular } from '../domain/filtros-celular';
import { identificarProdutoChaveNotebook } from '../domain/filtros';
import type { Oferta } from '../types/oferta';

export type ModuloHistorico = 'celular' | 'notebooks';

export interface PriceSnapshotInput {
  modulo: ModuloHistorico;
  produtoChave: string;
  loja: string;
  titulo: string;
  precoAvista: number;
  precoTotal: number;
  frete: number;
  url: string;
  fonteId?: string;
  coletadoEm?: string;
  /** Código do cupom quando o preço à vista já inclui desconto. */
  cupomTag?: string | null;
  cupomDesconto?: number | null;
}

const BATCH_SIZE = 50;

let schemaCupomOk = false;

function obterCliente(): Client | null {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) return null;

  // Arquivo local (file:) não exige token; Turso remoto sim.
  if (url.startsWith('file:')) {
    return createClient({ url });
  }

  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!authToken) return null;
  return createClient({ url, authToken });
}

/** Garante colunas de cupom (idempotente). */
async function ensureCupomColumns(client: Client): Promise<void> {
  if (schemaCupomOk) return;
  for (const sql of [
    'ALTER TABLE price_snapshots ADD COLUMN cupom_tag TEXT',
    'ALTER TABLE price_snapshots ADD COLUMN cupom_desconto REAL',
  ]) {
    try {
      await client.execute(sql);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Já existe / duplicate column — ok
      if (!/duplicate column|already exists/i.test(msg)) {
        // tabela pode não existir ainda em DB novo; ignora soft
        if (!/no such table/i.test(msg)) {
          console.warn(`[historico] migrate cupom: ${msg}`);
        }
      }
    }
  }
  schemaCupomOk = true;
}

export function ofertaParaSnapshotCelular(
  oferta: Oferta,
  coletadoEm: string = new Date().toISOString()
): PriceSnapshotInput | null {
  const produtoChave = identificarProdutoChaveCelular(oferta.titulo);
  if (!produtoChave) return null;

  return {
    modulo: 'celular',
    produtoChave,
    loja: oferta.loja,
    titulo: oferta.titulo,
    precoAvista: oferta.precoAVista,
    precoTotal: oferta.precoTotal,
    frete: oferta.frete,
    url: oferta.url,
    fonteId: oferta.fonteId,
    coletadoEm,
    cupomTag: oferta.cupomTag ?? null,
    cupomDesconto: oferta.cupomDesconto ?? null,
  };
}

export async function salvarHistorico(snapshots: PriceSnapshotInput[]): Promise<number> {
  if (snapshots.length === 0) return 0;

  const client = obterCliente();
  if (!client) {
    console.warn(
      '[historico] TURSO_DATABASE_URL / TURSO_AUTH_TOKEN ausentes — gravação de histórico ignorada.'
    );
    return 0;
  }

  let gravados = 0;

  try {
    await ensureCupomColumns(client);

    for (let i = 0; i < snapshots.length; i += BATCH_SIZE) {
      const lote = snapshots.slice(i, i + BATCH_SIZE);
      const statements = lote.map((s) => ({
        sql: `INSERT INTO price_snapshots (
            modulo, produto_chave, loja, titulo,
            preco_avista, preco_total, frete, url, fonte_id, coletado_em,
            cupom_tag, cupom_desconto
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          s.modulo,
          s.produtoChave,
          s.loja,
          s.titulo,
          s.precoAvista,
          s.precoTotal,
          s.frete,
          s.url,
          s.fonteId ?? null,
          s.coletadoEm ?? new Date().toISOString(),
          s.cupomTag?.trim() || null,
          s.cupomDesconto ?? null,
        ] as InArgs,
      }));

      await client.batch(statements, 'write');
      gravados += lote.length;
    }

    console.log(`[historico] ${gravados} snapshot(s) gravado(s) no Turso.`);
    return gravados;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[historico] Falha ao gravar snapshots: ${msg}`);
    return 0;
  } finally {
    client.close();
  }
}

export function ofertaParaSnapshotNotebook(
  oferta: Oferta,
  coletadoEm: string = new Date().toISOString()
): PriceSnapshotInput | null {
  const produtoChave = identificarProdutoChaveNotebook(oferta.titulo, oferta.sku);
  if (!produtoChave) return null;

  // precoAVista já é o preço da fonte; precoComCupom = produto com cupom (sem frete).
  let precoAvista = oferta.precoAVista;
  if (
    oferta.cupomTag &&
    oferta.precoComCupom != null &&
    Number.isFinite(oferta.precoComCupom) &&
    oferta.precoComCupom > 0 &&
    oferta.precoComCupom < precoAvista
  ) {
    precoAvista = Math.round(oferta.precoComCupom * 100) / 100;
  }

  const precoTotal = Math.round((precoAvista + oferta.frete) * 100) / 100;

  return {
    modulo: 'notebooks',
    produtoChave,
    loja: oferta.loja,
    titulo: oferta.titulo,
    precoAvista,
    precoTotal,
    frete: oferta.frete,
    url: oferta.url,
    fonteId: oferta.fonteId,
    coletadoEm,
    cupomTag: oferta.cupomTag?.trim() || null,
    cupomDesconto: oferta.cupomDesconto ?? null,
  };
}

/** Soft-fail: nunca propaga erro — Discord e o restante do tracker seguem. */
export async function salvarHistoricoCelular(ofertas: Oferta[]): Promise<number> {
  try {
    const coletadoEm = new Date().toISOString();
    const snapshots = ofertas
      .map((o) => ofertaParaSnapshotCelular(o, coletadoEm))
      .filter((s): s is PriceSnapshotInput => s !== null);

    if (snapshots.length === 0) {
      console.log('[historico] Nenhuma oferta celular mapeável para snapshot.');
      return 0;
    }

    return await salvarHistorico(snapshots);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[historico] Erro inesperado ao salvar histórico celular: ${msg}`);
    return 0;
  }
}

/** Soft-fail: nunca propaga erro — Discord notebooks segue intacto. */
export async function salvarHistoricoNotebooks(ofertas: Oferta[]): Promise<number> {
  try {
    const coletadoEm = new Date().toISOString();
    const snapshots = ofertas
      .map((o) => ofertaParaSnapshotNotebook(o, coletadoEm))
      .filter((s): s is PriceSnapshotInput => s !== null);

    if (snapshots.length === 0) {
      console.log('[historico] Nenhuma oferta notebook mapeável para snapshot.');
      return 0;
    }

    return await salvarHistorico(snapshots);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[historico] Erro inesperado ao salvar histórico notebooks: ${msg}`);
    return 0;
  }
}
