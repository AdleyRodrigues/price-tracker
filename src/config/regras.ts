import { CEP_DESTINO } from './env';

export const CEP = CEP_DESTINO;

export const TERMOS_BUSCA = [
  'notebook asus tuf rtx 4060',
  'notebook asus tuf rtx 5050',
  'notebook asus tuf rtx 5060',
  'asus tuf 16 rtx 4060',
  'asus tuf 16 rtx 5050',
  'asus tuf 16 rtx 5060',
  'asus tuf 16',
  'asus tuf f16',
  'asus tuf a16',
];

export const PROMOBIT_BUSCA_URLS = [
  'https://www.promobit.com.br/buscar?q=asus+tuf+rtx+4060',
  'https://www.promobit.com.br/buscar?q=asus+tuf+rtx+5050',
  'https://www.promobit.com.br/buscar?q=asus+tuf+rtx+5060',
  'https://www.promobit.com.br/buscar?q=asus+tuf+16',
];
export const PROMOBIT_SEARCH_APIS = [
  'https://api.promobit.com.br/search?q=asus+tuf+rtx+4060',
  'https://api.promobit.com.br/search?q=asus+tuf+rtx+5050',
  'https://api.promobit.com.br/search?q=asus+tuf+rtx+5060',
  'https://api.promobit.com.br/search?q=asus+tuf+16',
];

export const PROMOBIT_BUSCA_URL = PROMOBIT_BUSCA_URLS[0];
export const PROMOBIT_SEARCH_API = PROMOBIT_SEARCH_APIS[0];

export const AMAZON_BUSCA_URLS = [
  'https://www.amazon.com.br/s?k=notebook+asus+tuf+rtx+4060',
  'https://www.amazon.com.br/s?k=notebook+asus+tuf+rtx+5050',
  'https://www.amazon.com.br/s?k=notebook+asus+tuf+rtx+5060',
  'https://www.amazon.com.br/s?k=notebook+asus+tuf+16',
];

export const ASUS_BUSCA_URLS = [
  'https://br.store.asus.com/catalogsearch/result/?q=tuf',
  'https://br.store.asus.com/catalogsearch/result/?q=tuf+rtx',
  'https://br.store.asus.com/catalogsearch/result/?q=tuf+16',
];

export const FRETE_FALLBACK_COMUNIDADE = 100;
export const PRECO_MINIMO = 3500;
export const THRESHOLD_ALERTA_CRITICO = 5200;
export const FRETE_FALLBACK_LEVEROS = 86.98;
export const FRETE_FALLBACK_LG = 352.80;
export const FRETE_FALLBACK_WEBCONTINENTAL = 205;
export const FRETE_FALLBACK_AMAZON = 0;
export const TAMANHO_PODIO = Number(process.env.TAMANHO_PODIO) || 10;

export const TITULO_BLOQUEADO =
  /desktop|pc\s*gamer|placa\s*de\s*v[íi]deo|gpu|mesa|suporte|cooler|gabinete|fonte|monitor|teclado|usado|\bv16\b|\bv3607\b|gaming\s*v16/i;

export const VALIDA_NOTEBOOK = /notebook|laptop/i;
export const VALIDA_MARCA_ASUS = /\basus\b/i;
export const VALIDA_GPU = /(?:rtx\s*)?(?:4060|5050|5060)/i;
export const VALIDA_TELA_16_10 =
  /(?:16:10|16\/10|16\s*por\s*10|1920\s*x\s*1200|2560\s*x\s*1600|2880\s*x\s*1800|3200\s*x\s*2000|3840\s*x\s*2400|wuxga|wqxga|qhd\+|fhd\+|uhd\+|16(?:\.0)?\s*(?:"|''|”|pol|polegadas|pols)(?!\s*(?:gb|ram|ssd|ddr))|\b16\.0\b|\b14\.5\s*(?:"|pol)|\b(?:a16|f16|g16|m16|fx607|fx608|fa607|g614|g634|gu604|gu605)\b)/i;

export const OFERTA_ENCERRADA =
  /encerrada|expirada|expired|finished|closed|inativ[ao]|esgotad|indispon[íi]vel/i;

export const QNC_BUSCA_URLS = [
  'https://quenotebookcomprar.com.br/?s=asus+tuf+16',
  'https://quenotebookcomprar.com.br/?s=asus+tuf+rtx',
  'https://quenotebookcomprar.com.br/ofertas/?marca=asus',
  'https://quenotebookcomprar.com.br/ofertas/?gpu=rtx-4060,rtx-5050,rtx-5060',
];

export const MERCADO_LIVRE_BUSCA_URLS = [
  'https://lista.mercadolivre.com.br/notebook-asus-tuf-16',
  'https://lista.mercadolivre.com.br/notebook-asus-tuf-rtx-4060',
  'https://lista.mercadolivre.com.br/notebook-asus-tuf-rtx-5050',
  'https://lista.mercadolivre.com.br/notebook-asus-tuf-rtx-5060',
];
