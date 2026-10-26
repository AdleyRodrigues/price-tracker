export function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Limpa R$, espaços e milhar; suporta formatos pt-BR ("7.999,00", "7.694") e float padrão ("7999.00"). */
export function extrairPreco(texto: string): number {
  if (!texto) return Number.NaN;
  const limpo = texto.replace(/R\$/gi, '').replace(/\s/g, '').trim();

  // Se for padrão pt-BR de milhar sem centavos (ex: "7.694" ou "10.755")
  if (/^\d{1,3}\.\d{3}$/.test(limpo)) {
    return Number(limpo.replace('.', ''));
  }

  if (/^-?\d+(?:\.\d+)?$/.test(limpo)) {
    return Number(limpo);
  }

  const normalizado = limpo
    .replace(/\./g, '')
    .replace(/,/g, '.');
  const match = normalizado.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}
