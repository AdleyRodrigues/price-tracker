import { createClient, type Client, type InArgs } from '@libsql/client';
import { identificarProdutoChaveCelular } from '../domain/filtros-celular';
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
}

const BATCH_SIZE = 50;

function obterCliente(): Client | null {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) {
    return null;
  }
  return createClient({ url, authToken });
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
    for (let i = 0; i < snapshots.length; i += BATCH_SIZE) {
      const lote = snapshots.slice(i, i + BATCH_SIZE);
      const statements = lote.map((s) => ({
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
          s.fonteId ?? null,
          s.coletadoEm ?? new Date().toISOString(),
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
