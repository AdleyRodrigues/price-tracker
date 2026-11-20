import { labelConfigNotebook, labelProdutoNotebook } from '../../src/domain/filtros';

export const PRODUTO_LABELS: Record<string, string> = {
  poco_x8_pro_max: 'Poco X8 Pro Max',
  xiaomi_17t_pro: 'Xiaomi 17T Pro',
  xiaomi_15t_pro: 'Xiaomi 15T Pro',
  xiaomi_linha_t: 'Xiaomi Linha T (15T/17T)',
};

/** Label para celular (mapa) ou notebook (SKU · CPU · RAM · GPU). */
export function labelProduto(chave: string, tituloHint?: string): string {
  if (PRODUTO_LABELS[chave]) return PRODUTO_LABELS[chave]!;
  return labelProdutoNotebook(chave, tituloHint);
}


/** Label descritivo sem códigos (série · CPU · RAM · SSD · GPU) — usado nos KPIs. */
export function labelDescritivo(chave: string, tituloHint?: string): string {
  if (PRODUTO_LABELS[chave]) return PRODUTO_LABELS[chave]!;
  return labelConfigNotebook(chave, tituloHint);
}
