import { CEP_DESTINO } from './env';

export const CEP = CEP_DESTINO;

export const TERMOS_BUSCA = [
  'notebook asus tuf rtx 4060',
  'notebook asus tuf rtx 5050',
  'notebook asus tuf rtx 5060',
  'asus tuf 4060',
  'asus tuf 5050',
  'asus tuf 5060',
];

export const PROMOBIT_BUSCA_URLS = [
  'https://www.promobit.com.br/buscar?q=asus+tuf+4060',
  'https://www.promobit.com.br/buscar?q=asus+tuf+5050',
  'https://www.promobit.com.br/buscar?q=asus+tuf+5060',
];
export const PROMOBIT_SEARCH_APIS = [
  'https://api.promobit.com.br/search?q=asus+tuf+4060',
  'https://api.promobit.com.br/search?q=asus+tuf+5050',
  'https://api.promobit.com.br/search?q=asus+tuf+5060',
];

export const PROMOBIT_BUSCA_URL = PROMOBIT_BUSCA_URLS[0];
export const PROMOBIT_SEARCH_API = PROMOBIT_SEARCH_APIS[0];

export const AMAZON_BUSCA_URLS = [
  'https://www.amazon.com.br/s?k=notebook+asus+tuf+rtx+4060',
  'https://www.amazon.com.br/s?k=notebook+asus+tuf+rtx+5050',
  'https://www.amazon.com.br/s?k=notebook+asus+tuf+rtx+5060',
];

export const FRETE_FALLBACK_COMUNIDADE = 100;
export const PRECO_MINIMO = 3500;
export const THRESHOLD_ALERTA_CRITICO = 5200;
export const FRETE_FALLBACK_LEVEROS = 86.98;
export const FRETE_FALLBACK_LG = 352.80;
export const FRETE_FALLBACK_WEBCONTINENTAL = 205;
export const FRETE_FALLBACK_AMAZON = 0;
export const TAMANHO_PODIO = Number(process.env.TAMANHO_PODIO) || 5;

export const TITULO_BLOQUEADO =
  /desktop|pc\s*gamer|placa\s*de\s*v[íi]deo|gpu|mesa|suporte|cooler|gabinete|fonte|monitor|teclado|usado/i;

export const VALIDA_NOTEBOOK = /notebook|laptop/i;
export const VALIDA_LINHA_ASUS_TUF = /(?:asus.*tuf|tuf.*asus|tuf\s+gaming|tuf\s+a15|tuf\s+a16|tuf\s+f15|tuf\s+f16|\btuf\b)/i;
export const VALIDA_GPU = /(?:rtx\s*)?(?:4060|5050|5060)/i;

export const OFERTA_ENCERRADA =
  /encerrada|expirada|expired|finished|closed|inativ[ao]|esgotad|indispon[íi]vel/i;
