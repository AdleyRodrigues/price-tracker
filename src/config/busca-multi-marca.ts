/**
 * Busca ativa multi-marca para notebooks 4K (RTX 4060/5050/5060).
 * Gera URLs no formato que ML e KaBuM esperam (slug com hífens).
 *
 * Dell / Alienware / Gigabyte entram na coleta (premium no dash — Fase 2).
 */

export const MARCAS_BUSCA = ['ASUS', 'Acer', 'Avell', 'Dell', 'Lenovo', 'Gigabyte'] as const;
export type MarcaBusca = (typeof MARCAS_BUSCA)[number];

/** Termos de busca por marca (sem "notebook" — o builder prefixa). */
export const TERMOS_POR_MARCA: Record<MarcaBusca, string[]> = {
  ASUS: [
    'asus tuf f16 rtx 5060',
    'asus tuf f16 rtx 5050',
    'asus tuf a16 rtx 5060',
    'asus tuf rtx 4060',
    'asus gaming v16 rtx 5060',
  ],
  Acer: ['acer nitro v16 rtx 5060', 'acer nitro anv16 rtx 5060'],
  Avell: [
    'avell storm 560 rtx 5060',
    'avell storm 560',
    'avell ion a70 rtx 5060',
    'avell ion a70',
    'avell rtx 5060',
  ],
  Dell: [
    'dell g15 rtx 4060',
    'dell g16 rtx 4060',
    'dell g16 rtx 5060',
    'alienware m16 rtx 4060',
    'alienware m16 rtx 5060',
    'alienware x16 rtx',
  ],
  Lenovo: ['lenovo loq rtx 5060', 'lenovo loq 15 rtx 5060', 'lenovo loq 16 rtx 5060'],
  Gigabyte: [
    'gigabyte aorus 16 rtx 4060',
    'gigabyte aorus 16 rtx 5060',
    'gigabyte a16 rtx 5050',
    'gigabyte a16 rtx 5060',
    'gigabyte g6 rtx 4060',
    'gigabyte g6kf rtx 4060',
  ],
};

/** Slug de path: "avell storm 560" → "avell-storm-560" */
export function slugBusca(termo: string): string {
  return termo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Query string: "avell storm 560" → "avell+storm+560" */
export function queryBusca(termo: string): string {
  return termo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(encodeURIComponent)
    .join('+');
}

/**
 * Mercado Livre (lista):
 * https://lista.mercadolivre.com.br/notebook-avell-storm-560
 */
export function urlMercadoLivre(termo: string): string {
  const comNotebook = /\bnotebook\b/i.test(termo) ? termo : `notebook ${termo}`;
  return `https://lista.mercadolivre.com.br/${slugBusca(comNotebook)}`;
}

/**
 * KaBuM! (busca Next.js):
 * https://www.kabum.com.br/busca/notebook-avell-storm-560
 */
export function urlKabumBusca(termo: string): string {
  const comNotebook = /\bnotebook\b/i.test(termo) ? termo : `notebook ${termo}`;
  return `https://www.kabum.com.br/busca/${slugBusca(comNotebook)}`;
}

/** Promobit API / HTML */
export function urlPromobitApi(termo: string): string {
  return `https://api.promobit.com.br/search?q=${queryBusca(termo)}`;
}

export function urlPromobitHtml(termo: string): string {
  return `https://www.promobit.com.br/buscar?q=${queryBusca(termo)}`;
}

export function urlAmazon(termo: string): string {
  const comNotebook = /\bnotebook\b/i.test(termo) ? termo : `notebook ${termo}`;
  return `https://www.amazon.com.br/s?k=${queryBusca(comNotebook)}`;
}

/** Todas as URLs ML geradas a partir das marcas. */
export function gerarUrlsMercadoLivre(marcas: readonly MarcaBusca[] = MARCAS_BUSCA): string[] {
  const urls: string[] = [];
  for (const marca of marcas) {
    for (const termo of TERMOS_POR_MARCA[marca]) {
      urls.push(urlMercadoLivre(termo));
    }
  }
  return [...new Set(urls)];
}

export function gerarUrlsKabum(marcas: readonly MarcaBusca[] = MARCAS_BUSCA): string[] {
  const urls: string[] = [];
  for (const marca of marcas) {
    for (const termo of TERMOS_POR_MARCA[marca]) {
      urls.push(urlKabumBusca(termo));
    }
  }
  return [...new Set(urls)];
}

export function gerarUrlsPromobitApi(marcas: readonly MarcaBusca[] = MARCAS_BUSCA): string[] {
  const urls: string[] = [];
  for (const marca of marcas) {
    for (const termo of TERMOS_POR_MARCA[marca]) {
      urls.push(urlPromobitApi(termo));
    }
  }
  return [...new Set(urls)];
}

/** Marcas ativas na coleta (inclui premium Dell/Gigabyte; Alienware via termos Dell). */
export const MARCAS_COM_SERIE: MarcaBusca[] = [
  'ASUS',
  'Acer',
  'Avell',
  'Lenovo',
  'Dell',
  'Gigabyte',
];
