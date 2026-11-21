import { CEP_DESTINO } from './env';
import {
  MARCAS_COM_SERIE,
  TERMOS_POR_MARCA,
  gerarUrlsKabum,
  gerarUrlsMercadoLivre,
  gerarUrlsPromobitApi,
  queryBusca,
  urlAmazon,
  urlPromobitHtml,
} from './busca-multi-marca';

export const CEP = CEP_DESTINO;

/** Termos flat (prefixo notebook) — usados por scrapers legados / logs. */
export const TERMOS_BUSCA = MARCAS_COM_SERIE.flatMap((marca) =>
  TERMOS_POR_MARCA[marca].map((t) => (/^notebook\b/i.test(t) ? t : `notebook ${t}`))
);

export const PROMOBIT_BUSCA_URLS = MARCAS_COM_SERIE.flatMap((marca) =>
  TERMOS_POR_MARCA[marca].map((t) => urlPromobitHtml(t))
);
export const PROMOBIT_SEARCH_APIS = gerarUrlsPromobitApi(MARCAS_COM_SERIE);

export const PROMOBIT_BUSCA_URL = PROMOBIT_BUSCA_URLS[0]!;
export const PROMOBIT_SEARCH_API = PROMOBIT_SEARCH_APIS[0]!;

export const AMAZON_BUSCA_URLS = MARCAS_COM_SERIE.flatMap((marca) =>
  TERMOS_POR_MARCA[marca].map((t) => urlAmazon(t))
);

export const KABUM_BUSCA_URLS = gerarUrlsKabum(MARCAS_COM_SERIE);

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

export const TETO_ORCAMENTO_4K = 9000;

/**
 * Bloqueios explícitos de título (periféricos, usados, e ASUS premium).
 * Dell G16 / Alienware M16 NÃO entram aqui — ver SERIE_FORA_ESCOPO em filtros.ts.
 */
export const TITULO_BLOQUEADO =
  /desktop|pc\s*gamer|placa\s*de\s*v[íi]deo|(?<![a-z])gpu(?![a-z])|mesa|suporte|cooler|gabinete|fonte|monitor|teclado|usado|\bg614\b|\bg634\b|\bg615\b|\bg814\b|\bgu604\b|\bgu605\b|\bgu606\b|rog\s*strix|strix\s*g\s*16|zephyrus|tuf\s*gaming\s*g\s*16|tuf\s*gaming\s*m\s*16/i;

/** Custo estimado (BRL) de upgrade 8→16 GB SODIMM — usado em avisos, não no preço. */
export const CUSTO_UPGRADE_RAM_BRL = 200;

/** Limiar de TGP (W) para “Aprovado para 4K” vs “Oportunidades”. */
export const TGP_MIN_APROVADO_4K = 100;

export const VALIDA_NOTEBOOK = /notebook|laptop/i;
export const VALIDA_MARCAS_PERMITIDAS =
  /\b(asus|avell|lenovo|acer|dell|alienware|gigabyte|aorus)\b/i;
// Retrocompatibilidade para módulos que importam VALIDA_MARCA_ASUS
export const VALIDA_MARCA_ASUS = VALIDA_MARCAS_PERMITIDAS;
export const VALIDA_GPU = /(?:rtx\s*)?(?:4060|5050|5060)/i;
export const VALIDA_TELA_16_10 =
  /(?:16:10|16\/10|16\s*por\s*10|1920\s*x\s*1200|2560\s*x\s*1600|2880\s*x\s*1800|3200\s*x\s*2000|3840\s*x\s*2400|wuxga|wqxga|qhd\+|fhd\+|uhd\+|16(?:\.0)?\s*(?:"|''|”|pol|polegadas|pols)(?!\s*(?:gb|ram|ssd|ddr))|\b16\.0\b|\b14\.5\s*(?:"|pol)|\b(?:a16|f16|v16|v3607|storm|ion|loq|anv16|nitro|fx607|fx608|fa607|fa608|g15|g16|m16|x16|aorus|g6kf|g6)\b)/i;

export const OFERTA_ENCERRADA =
  /encerrada|expirada|expired|finished|closed|inativ[ao]|esgotad|indispon[íi]vel/i;

export const QNC_BUSCA_URLS = [
  'https://quenotebookcomprar.com.br/?s=asus+tuf+16',
  'https://quenotebookcomprar.com.br/?s=asus+tuf+rtx',
  'https://quenotebookcomprar.com.br/ofertas/?marca=asus',
  'https://quenotebookcomprar.com.br/ofertas/?gpu=rtx-4060,rtx-5050,rtx-5060',
  'https://quenotebookcomprar.com.br/?s=lenovo+loq',
  'https://quenotebookcomprar.com.br/?s=avell+storm',
  'https://quenotebookcomprar.com.br/?s=nitro+v16',
  'https://quenotebookcomprar.com.br/?s=asus+v16',
];

/** URLs geradas por marca (inclui Dell / Gigabyte premium). */
export const MERCADO_LIVRE_BUSCA_URLS = gerarUrlsMercadoLivre(MARCAS_COM_SERIE);

export { queryBusca, MARCAS_COM_SERIE };
