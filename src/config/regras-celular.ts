import { CEP_DESTINO } from './env';

export const CEP = CEP_DESTINO;

export const TERMOS_BUSCA_CELULAR = [
  'xiaomi 17t pro',
  'xiaomi 15t pro',
  'poco x8 pro max',
];

export const PROMOBIT_BUSCA_URLS_CELULAR = [
  'https://www.promobit.com.br/buscar?q=xiaomi+17t+pro',
  'https://www.promobit.com.br/buscar?q=xiaomi+15t+pro',
  'https://www.promobit.com.br/buscar?q=poco+x8+pro+max',
];

export const PROMOBIT_SEARCH_APIS_CELULAR = [
  'https://api.promobit.com.br/search?q=xiaomi+17t+pro',
  'https://api.promobit.com.br/search?q=xiaomi+15t+pro',
  'https://api.promobit.com.br/search?q=poco+x8+pro+max',
  'https://api.promobit.com.br/search?q=poco+x8',
];

export const AMAZON_BUSCA_URLS_CELULAR = [
  'https://www.amazon.com.br/s?k=xiaomi+17t+pro',
  'https://www.amazon.com.br/s?k=xiaomi+15t+pro',
  'https://www.amazon.com.br/s?k=poco+x8+pro+max',
];

export const MERCADO_LIVRE_BUSCA_URLS_CELULAR = [
  'https://lista.mercadolivre.com.br/xiaomi-17t-pro',
  'https://lista.mercadolivre.com.br/xiaomi-15t-pro',
  'https://lista.mercadolivre.com.br/poco-x8-pro-max',
];

export const PRECO_MINIMO_CELULAR = 1800;
export const THRESHOLD_ALERTA_CRITICO_CELULAR = 4200;
export const FRETE_FALLBACK_CELULAR = 0;
export const TAMANHO_PODIO_CELULAR = 5;

export const TITULO_BLOQUEADO_CELULAR =
  /capa|capinha|case|cover|pel[íi]cula|vidro\s*3d|vidro\s*temperado|cabo\s*usb|carregador|fonte\s*turbo|adaptador|fone|fone\s*de\s*ouvido|headphone|earbuds|smartwatch|pulseira|suporte|braçadeira|bateria\s*avulsa|placa\s*m[ãa]e|display|touch\s*screen|m[óo]dulo\s*frontal|peça|pe[çc]as|troca|conserto|usado|vitrine|recondicionado|r[ée]plica|fake/i;

export const VALIDA_MARCA_XIAOMI = /\b(?:xiaomi|mi|poco)\b/i;
export const VALIDA_MODELO_CELULAR =
  /(?:\b17t\s*pro\b|\b15t\s*pro\b|\bpoco\s*x8\s*pro\s*max\b|\bx8\s*pro\s*max\b)/i;
export const VALIDA_DISPOSITIVO_CELULAR = /smartphone|celular|telefone|\bxiaomi\b|\bpoco\b/i;

export interface ItemCatalogoCelular {
  loja: string;
  produto: string;
  url: string;
  parser: 'kabum' | 'shopee' | string;
  freteFallback?: number;
}

export const CATALOGO_CELULAR: ItemCatalogoCelular[] = [
  {
    loja: 'KaBuM!',
    produto: 'Celular Xiaomi 17T Pro 512GB 12GB RAM Preto Global',
    url: 'https://www.kabum.com.br/produto/1053832/celular-xiaomi-17t-pro-de-512gb-12gb-ram-de-6-83-50-50-12mp-32mp-preto-global-',
    parser: 'kabum',
    freteFallback: 0,
  },
  {
    loja: 'KaBuM!',
    produto: 'Celular Xiaomi 17T Pro 512GB 12GB RAM Azul Global',
    url: 'https://www.kabum.com.br/produto/1053423/celular-xiaomi-17t-pro-de-512gb-12gb-ram-de-6-83-50-50-12mp-32mp-azul-global-',
    parser: 'kabum',
    freteFallback: 0,
  },
  {
    loja: 'KaBuM!',
    produto: 'Celular Xiaomi 17T Pro 512GB 12GB RAM Negro Global',
    url: 'https://www.kabum.com.br/produto/1053424/celular-xiaomi-17t-pro-de-512gb-12gb-ram-de-6-83-50-50-12mp-32mp-negro-global-',
    parser: 'kabum',
    freteFallback: 0,
  },
  {
    loja: 'Mercado Livre',
    produto: 'Xiaomi 17T Pro 1TB 24GB RAM 5G NFC Global',
    url: 'https://www.mercadolivre.com.br/xiaomi-17t-pro-1tb-1024gb-24gb-ram-1212gb-5g-nfc-global/up/MLBU4567809885?pdp_filters=item_id%3AMLB4993944013',
    parser: 'mercadolivre',
    freteFallback: 0,
  },
  {
    loja: 'Shopee',
    produto: 'Xiaomi 17T Pro 512GB OU 1TB 12GB RAM 5G Global Leica',
    url: 'https://shopee.com.br/NOVO-Xiaomi-17T-Pro-512GB-OU-1TB-12GB-RAM-5G-NFC-COM-CAMERA-LEICA-Vers%C3%A3o-Global-Lacrado-Pronta-Entrega-i.1351433975.58263590014',
    parser: 'shopee',
    freteFallback: 0,
  },
];

