export const PRODUTO_LABELS: Record<string, string> = {
  poco_x8_pro_max: 'Poco X8 Pro Max',
  xiaomi_17t_pro: 'Xiaomi 17T Pro',
  xiaomi_15t_pro: 'Xiaomi 15T Pro',
};

export function labelProduto(chave: string): string {
  return PRODUTO_LABELS[chave] ?? chave;
}
