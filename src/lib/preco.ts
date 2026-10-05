export function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Limpa R$, espaços e milhar; suporta formatos pt-BR ("7.999,00") e float padrão ("7999.00"). */
export function extrairPreco(texto: string): number {
  if (!texto) return Number.NaN;
  const limpo = texto.replace(/R\$/gi, '').trim();
  if (/^-?\d+(?:\.\d+)?$/.test(limpo)) {
    return Number(limpo);
  }
  const normalizado = limpo
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  const match = normalizado.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}
