import { extrairHardware } from './hardware';

/**
 * Resolução de RAM de notebooks em camadas — o objetivo é SEMPRE ter um valor.
 *
 * Ordem de confiança:
 *  1. titulo     → RAM explícita no título do anúncio
 *  2. pagina     → RAM extraída da ficha técnica da página do produto (coleta)
 *  3. historico  → RAM mais frequente nos outros títulos do mesmo SKU (dashboard)
 *  4. catalogo   → configuração de fábrica conhecida do part number ASUS
 *  5. estimado   → padrão da série (F16/A16) quando nada acima existe
 */
export type FonteRam = 'titulo' | 'pagina' | 'historico' | 'catalogo' | 'estimado';

export interface RamResolvida {
  gb: number;
  fonte: FonteRam;
}

/** Capacidades plausíveis para notebook (evita confundir com VRAM/SSD). */
const CAPACIDADES_VALIDAS = new Set([4, 8, 12, 16, 24, 32, 48, 64]);

/**
 * Part numbers ASUS → RAM de fábrica (GB).
 * Base: variante mais vendida no BR / histórico coletado.
 * Variantes completas (com sufixo) têm prioridade sobre o PN base.
 */
export const CATALOGO_RAM_NOTEBOOK: Record<string, number> = {
  // TUF Gaming F16 (2025) — FX608
  fx608jhi: 16, // i5/i7 14ª + RTX 5050 — 16 GB (458/458 títulos no histórico)
  fx608jmi: 16, // RTX 5060 — 16 GB (175/175 títulos)
  fx608jhr: 8, //  RTX 5050 — 8 GB na maioria (120 × 8 GB vs 23 × 16 GB)
  // TUF Gaming A16 — FA607
  fa607nv: 16, // Ryzen 7 + RTX 4060 — 16 GB DDR5 (ficha ASUS)
  // ➕ Adicione aqui novos PNs conforme entrarem no escopo.
};

/** Padrão por série quando o PN não está no catálogo. */
const PADRAO_SERIE: Array<[RegExp, number]> = [
  [/^(fx608|fx607|f16_)|\bf16\b/i, 16],
  [/^(fa607|fa608|a16_)|\ba16\b/i, 16],
];
const PADRAO_GERAL_GB = 16;

function gbValido(n: number): number | null {
  return CAPACIDADES_VALIDAS.has(n) ? n : null;
}

/** RAM no título do anúncio (reusa o extrator de hardware). */
export function ramDoTitulo(titulo: string | undefined | null): number | null {
  if (!titulo) return null;
  const ram = extrairHardware(titulo).ram;
  const n = ram ? Number(ram.match(/\d+/)?.[0]) : NaN;
  return Number.isFinite(n) ? gbValido(n) : null;
}

/**
 * RAM a partir do texto da ficha técnica de uma página de produto.
 * Cobre Amazon ("Tamanho da memória RAM 16 GB"), KaBuM!/Magalu/ASUS
 * ("Memória RAM: 16GB", "Memória: 16 GB DDR5", "RAM instalada 16 GB").
 */
export function ramDoTextoPagina(texto: string | undefined | null): number | null {
  if (!texto) return null;
  const t = texto.replace(/\s+/g, ' ');

  const padroes: RegExp[] = [
    /tamanho\s+da\s+mem[óo]ria\s+ram\s*:?\s*(\d{1,2})\s*gb/i,
    /mem[óo]ria\s+ram\s+instalada\s*:?\s*(\d{1,2})\s*gb/i,
    /ram\s+instalada\s*:?\s*(\d{1,2})\s*gb/i,
    /capacidade\s+(?:da\s+)?mem[óo]ria\s*(?:ram)?\s*:?\s*(\d{1,2})\s*gb/i,
    /mem[óo]ria\s+ram\s*:?\s*(\d{1,2})\s*gb/i,
    /mem[óo]ria\s*:?\s*(\d{1,2})\s*gb\s*(?:ddr\d|lpddr\d|so-?dimm)/i,
    /(\d{1,2})\s*gb\s*(?:de\s+)?(?:mem[óo]ria\s+)?ram\b/i,
    /(\d{1,2})\s*gb\s*(?:lp)?ddr[45]x?\b/i,
    /\bram\s*:?\s*(\d{1,2})\s*gb/i,
  ];

  for (const re of padroes) {
    const m = t.match(re);
    if (m) {
      const n = gbValido(Number(m[1]));
      if (n) return n;
    }
  }
  return null;
}

/** RAM mais frequente entre vários títulos do mesmo SKU. */
export function ramPorConsenso(titulos: Array<string | null | undefined>): number | null {
  const contagem = new Map<number, number>();
  for (const t of titulos) {
    const n = ramDoTitulo(t ?? '');
    if (n) contagem.set(n, (contagem.get(n) ?? 0) + 1);
  }
  let melhor: number | null = null;
  let max = 0;
  for (const [gb, qtd] of contagem) {
    if (qtd > max) {
      melhor = gb;
      max = qtd;
    }
  }
  return melhor;
}

/** Consenso ignorando títulos cuja RAM foi apenas estimada/catalogada. */
function ramPorConsensoReal(titulos: Array<string | null | undefined>): number | null {
  return ramPorConsenso(titulos.filter((t) => t && !/GB RAM \((ficha técnica|estimado)\)/i.test(t)));
}

/** RAM de fábrica pelo part number (variante completa > PN base). */
export function ramDoCatalogo(chaveOuTexto: string | undefined | null): number | null {
  if (!chaveOuTexto) return null;
  const texto = chaveOuTexto.toLowerCase();
  const variante = texto.match(/\b([a-z]{2}\d{3}[a-z]{2,5})-([a-z]{0,4}\d{0,5})\b/i);
  if (variante) {
    const full = `${variante[1]}-${variante[2]}`.toLowerCase();
    if (CATALOGO_RAM_NOTEBOOK[full]) return CATALOGO_RAM_NOTEBOOK[full]!;
  }
  for (const m of texto.matchAll(/\b([a-z]{2}\d{3}[a-z]{2,5})\b/gi)) {
    const base = m[1]!.toLowerCase();
    if (CATALOGO_RAM_NOTEBOOK[base]) return CATALOGO_RAM_NOTEBOOK[base]!;
  }
  return null;
}

/** Chave de fallback do histórico já carrega a RAM (ex.: a16_rtx5060_16gb). */
function ramDaChave(chave: string | undefined | null): number | null {
  const m = chave?.match(/_(\d{1,2})gb$/i);
  return m ? gbValido(Number(m[1])) : null;
}

/**
 * Resolve a RAM sempre retornando um valor, com a fonte usada.
 */
export function resolverRamNotebook(input: {
  titulo?: string | null;
  chave?: string | null;
  textoPagina?: string | null;
  titulosHistorico?: Array<string | null | undefined>;
}): RamResolvida {
  // Título enriquecido na coleta com marcação de origem
  const marcado = input.titulo?.match(/(\d{1,2})\s*GB RAM \((ficha técnica|estimado)\)/i);
  if (marcado) {
    const gb = gbValido(Number(marcado[1]));
    if (gb) {
      // Se o histórico tiver valor real, ele vence a estimativa/ficha.
      const real = input.titulosHistorico ? ramPorConsensoReal(input.titulosHistorico) : null;
      if (real) return { gb: real, fonte: 'historico' };
      return { gb, fonte: /ficha/i.test(marcado[2]!) ? 'catalogo' : 'estimado' };
    }
  }

  const doTitulo = ramDoTitulo(input.titulo) ?? ramDaChave(input.chave);
  if (doTitulo) return { gb: doTitulo, fonte: 'titulo' };

  const daPagina = ramDoTextoPagina(input.textoPagina);
  if (daPagina) return { gb: daPagina, fonte: 'pagina' };

  const doHistorico = input.titulosHistorico ? ramPorConsensoReal(input.titulosHistorico) : null;
  if (doHistorico) return { gb: doHistorico, fonte: 'historico' };

  const doCatalogo = ramDoCatalogo(input.chave) ?? ramDoCatalogo(input.titulo);
  if (doCatalogo) return { gb: doCatalogo, fonte: 'catalogo' };

  const ref = `${input.chave ?? ''} ${input.titulo ?? ''}`;
  for (const [re, gb] of PADRAO_SERIE) {
    if (re.test(ref)) return { gb, fonte: 'estimado' };
  }
  return { gb: PADRAO_GERAL_GB, fonte: 'estimado' };
}

/** Texto amigável: "16 GB RAM" (+ marcação quando não veio do anúncio/página). */
export function formatarRam(r: RamResolvida): string {
  const base = `${r.gb} GB RAM`;
  if (r.fonte === 'catalogo') return `${base} (ficha técnica)`;
  if (r.fonte === 'estimado') return `${base} (estimado)`;
  return base;
}
