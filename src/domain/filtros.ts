import {
  OFERTA_ENCERRADA,
  PRECO_MINIMO,
  TITULO_BLOQUEADO,
  VALIDA_GPU,
  VALIDA_MARCA_ASUS,
  VALIDA_NOTEBOOK,
  VALIDA_TELA_16_10,
} from '../config/regras';
import { extrairHardware } from './hardware';
import { formatarRam, resolverRamNotebook } from './ram-notebook';
import { Oferta } from '../types/oferta';
import { extrairPreco } from '../lib/preco';

/** Part number comercial ASUS (ex.: FX608JHI, FX608JHR, FA607WI). */
const ASUS_PART_NUMBER = /\b([A-Z]{2}\d{3}[A-Z]{2,5})(?:-[A-Z]{0,4}\d{0,5})?\b/i;

/** ASIN Amazon típico — não é modelo de notebook. */
const AMAZON_ASIN = /^B0[A-Z0-9]{8}$/i;

/** Séries permitidas no histórico/dash: só TUF F16 e A16. */
const SERIE_NOTEBOOK = /\b(f16|a16|fx608|fx607|fa607)\b/i;

/** Fora do escopo: V16, G16, M16 e afins. */
const SERIE_FORA_ESCOPO =
  /\bv16\b|\bv3607\b|\brp213\b|gaming\s*v16|\bg16\b|\bm16\b|\bg614\b|\bg634\b|\bgu604\b|\bgu605\b|rog\s*strix\s*g16|tuf\s*gaming\s*g16|tuf\s*gaming\s*m16/i;

/** Part numbers ASUS que não são F16/A16. */
const PN_FORA_ESCOPO = /^(g6|gu|m6|gx|gz)/i;
const PN_F16_A16 = /^(fx608|fx607|fa607)/i;

/** Sufixos comerciais do F16 que às vezes aparecem sem o PN completo. */
const F16_SUFFIX_TO_PN: Record<string, string> = {
  tu292: 'fx608jhi',
  tu293: 'fx608jhi',
  tu293w: 'fx608jhi',
  rv122: 'fx608jhr',
  rv122w: 'fx608jhr',
  rv124: 'fx608jhr',
  tu325: 'fx608jmi',
};

export function ehAsinAmazon(valor: string | undefined | null): boolean {
  if (!valor) return false;
  return AMAZON_ASIN.test(valor.trim());
}

export function extrairPartNumberAsus(texto: string): string | null {
  if (!texto) return null;
  const match = texto.match(ASUS_PART_NUMBER);
  if (!match?.[1]) return null;
  return match[1].toLowerCase();
}

/**
 * Quando o anúncio é TUF F16 sem FX608…, infere o SKU comercial pela config
 * (loja oficial costuma omitir o part number).
 */
export function inferirSkuTufF16(titulo: string): string | null {
  if (!/\bf16\b/i.test(titulo) && !/tuf\s+gaming\s+f16/i.test(titulo)) {
    return null;
  }

  const suffix = titulo.match(/\b(tu\d{3}w?|rv\d{3}w?)\b/i)?.[1]?.toLowerCase();
  if (suffix && F16_SUFFIX_TO_PN[suffix]) return F16_SUFFIX_TO_PN[suffix]!;

  const hw = extrairHardware(titulo);
  const gpu = hw.gpu?.toLowerCase().replace(/\s+/g, '') ?? '';
  const ramGb = hw.ram ? Number(hw.ram.match(/\d+/)?.[0] ?? 0) : 0;

  if (gpu.includes('5060')) return 'fx608jmi';
  if (gpu.includes('5050')) {
    // JHR costuma ser 8 GB; JHI é a linha 16 GB (i5/i7).
    if (ramGb > 0 && ramGb <= 8) return 'fx608jhr';
    return 'fx608jhi';
  }
  return null;
}

function ehSerieF16OuA16(texto: string, chave?: string | null): boolean {
  if (chave) {
    if (PN_FORA_ESCOPO.test(chave) || /^(g16|m16|v16)_/i.test(chave)) return false;
    if (PN_F16_A16.test(chave) || /^(f16|a16)_/i.test(chave)) return true;
    // Part number ASUS genérico que não é da família F16/A16
    if (/^[a-z]{2}\d{3}[a-z]{2,5}$/i.test(chave)) return false;
  }
  if (SERIE_FORA_ESCOPO.test(texto)) return false;
  return /\b(f16|a16|fx608|fx607|fa607)\b/i.test(texto) || /tuf\s+gaming\s+(f16|a16)\b/i.test(texto);
}

/**
 * Chave de histórico por modelo/SKU (1 linha no dash por notebook).
 * Escopo: só TUF F16 e A16.
 * 1) Part number ASUS no título/sku
 * 2) Inferência TUF F16 → FX608JHI/JHR/JMI
 * 3) Ignora ASIN
 * 4) Fallback série+GPU (+RAM quando houver)
 */
export function identificarProdutoChaveNotebook(
  titulo: string,
  sku?: string
): string | null {
  const texto = `${titulo} ${sku ?? ''}`;
  if (SERIE_FORA_ESCOPO.test(texto)) return null;

  let chave: string | null = null;

  if (sku && !ehAsinAmazon(sku)) {
    const doSku = extrairPartNumberAsus(sku) ?? (/^[A-Z]{2}\d{3}[A-Z]{2,5}$/i.test(sku.trim())
      ? sku.trim().toLowerCase()
      : null);
    if (doSku) chave = doSku;
  }

  if (!chave) {
    const doTitulo = extrairPartNumberAsus(titulo);
    if (doTitulo) chave = doTitulo;
  }

  if (!chave) {
    chave = inferirSkuTufF16(titulo);
  }

  if (!chave) {
    const hw = extrairHardware(titulo);
    const serieRaw = titulo.match(SERIE_NOTEBOOK)?.[1]?.toLowerCase();
    const serie =
      serieRaw === 'fx608' || serieRaw === 'fx607'
        ? 'f16'
        : serieRaw === 'fa607'
          ? 'a16'
          : serieRaw;
    const gpu = hw.gpu?.toLowerCase().replace(/\s+/g, '') ?? null;
    const ram = hw.ram?.match(/\d+/)?.[0] ?? null;

    if (!serie && !gpu) return null;
    if (serie !== 'f16' && serie !== 'a16') return null;

    // Fallback estável: série + GPU + RAM (sem CPU, que fragmentava i5 vs i5-14450hx).
    chave = [serie, gpu ?? 'gpu', ram ? `${ram}gb` : null].filter(Boolean).join('_');
  }

  if (!ehSerieF16OuA16(texto, chave)) return null;
  return chave;
}

/** Label amigável: SKU/série · CPU · RAM · GPU. */
export function labelProdutoNotebook(chave: string, tituloHint?: string): string {
  const pn = /^[a-z]{2}\d{3}[a-z]{2,5}$/i.test(chave) ? chave.toUpperCase() : null;

  if (!tituloHint) {
    if (pn) return `${pn} · ${formatarRam(resolverRamNotebook({ chave })).replace(' RAM', '')}`;
    return chave
      .split('_')
      .map((p) => p.toUpperCase())
      .join(' · ');
  }

  const hw = extrairHardware(tituloHint);
  const serie = tituloHint.match(SERIE_NOTEBOOK)?.[1]?.toUpperCase();
  const modelo = pn ?? serie ?? chave.split('_')[0]?.toUpperCase() ?? chave.toUpperCase();
  const partes = [modelo];
  if (hw.cpu) partes.push(hw.cpu);
  partes.push(formatarRam(resolverRamNotebook({ titulo: tituloHint, chave })).replace(' RAM', ''));
  if (hw.gpu) partes.push(hw.gpu);
  return partes.join(' · ');
}

/** Nome comercial da série a partir da chave/título (sem part number). */
function nomeSerieNotebook(chave: string, tituloHint?: string): string {
  const texto = `${chave} ${tituloHint ?? ''}`;
  if (/^(fx608|fx607)|^f16_/i.test(chave) || /\b(f16|fx608|fx607)\b/i.test(texto)) return 'ASUS TUF Gaming F16';
  if (/^(fa607|fa608)|^a16_/i.test(chave) || /\b(a16|fa607|fa608)\b/i.test(texto)) return 'ASUS TUF Gaming A16';
  return 'Notebook ASUS';
}

/**
 * Label descritivo (sem códigos): Série · CPU · RAM · SSD · GPU.
 * Ex.: "ASUS TUF Gaming A16 · Ryzen 7 · 16 GB RAM · 512 GB SSD · RTX 4060"
 */
export function labelConfigNotebook(chave: string, tituloHint?: string): string {
  const hw = extrairHardware(tituloHint ?? '');
  const ram = formatarRam(resolverRamNotebook({ titulo: tituloHint, chave }));
  const gpuChave = chave.match(/rtx\s*(\d{4})/i)?.[1];
  const gpu = hw.gpu ?? (gpuChave ? `RTX ${gpuChave}` : null);

  const partes = [nomeSerieNotebook(chave, tituloHint)];
  if (hw.cpu) partes.push(hw.cpu);
  partes.push(ram);
  if (hw.ssd) partes.push(hw.ssd);
  if (gpu) partes.push(gpu);
  return partes.join(' · ');
}

export function tituloBloqueado(titulo: string, sku?: string): boolean {
  if (!titulo) return true;
  const textoCompleto = `${titulo} ${sku ?? ''}`;

  // 1. Bloqueios explícitos (desktop, pc gamer, placa de video, gpu, mesa, suporte, cooler, gabinete, fonte, monitor, teclado, usado)
  // Ignora menções legítimas a teclado embutido de notebook (ex: "teclado iluminado")
  const textoParaBloqueio = textoCompleto.replace(/teclado\s+(?:iluminado|retroiluminado|rgb|abnt\d?|chiclet)/gi, '');
  if (TITULO_BLOQUEADO.test(textoParaBloqueio)) return true;

  // 2. Exige obrigatoriamente que seja notebook ou laptop
  if (!VALIDA_NOTEBOOK.test(textoCompleto)) return true;

  // 3. Exige obrigatoriamente que seja da marca ASUS
  if (!VALIDA_MARCA_ASUS.test(textoCompleto)) return true;

  // 4. Exige obrigatoriamente que contenha GPU RTX 4060, 5050 ou 5060
  if (!VALIDA_GPU.test(textoCompleto)) return true;

  // 5. Exige obrigatoriamente que a tela seja proporção 16:10 (16", 14.5", WUXGA, WQXGA, QHD+, A16, F16, G16, V16, etc.)
  if (!VALIDA_TELA_16_10.test(textoCompleto)) return true;

  return false;
}

export function precoAbaixoDoPiso(preco: number): boolean {
  return !Number.isFinite(preco) || preco < PRECO_MINIMO;
}

export function ofertaEncerrada(status: string): boolean {
  return OFERTA_ENCERRADA.test(status);
}

export function ofertaBrutaValida(titulo: string, preco: number, status = '', sku?: string): boolean {
  if (tituloBloqueado(titulo, sku)) {
    console.log(`[filtro] descartado pela validação de modelo/hardware: "${titulo}" (${sku ?? 'sem sku'})`);
    return false;
  }
  if (precoAbaixoDoPiso(preco)) return false;
  if (ofertaEncerrada(status)) return false;
  return true;
}

export function aceitarOferta(oferta: Oferta): boolean {
  if (!oferta) return false;
  if (!Number.isFinite(oferta.precoTotal) || oferta.precoTotal < PRECO_MINIMO) return false;
  if (!Number.isFinite(oferta.precoAVista) || oferta.precoAVista <= 0) return false;
  if (!Number.isFinite(oferta.frete) || oferta.frete < 0) return false;
  return ofertaBrutaValida(oferta.titulo, oferta.precoTotal, '', oferta.sku);
}

export function extrairInformacoesCupom(texto: string): {
  cupomTag?: string;
  cupomDesconto?: number;
  percentualDesconto?: number;
} {
  if (!texto) return {};

  const matchTag = texto.match(/cupom[:\s]+([A-Z0-9_-]{3,})/i) || texto.match(/use\s+o\s+c[óo]digo[:\s]+([A-Z0-9_-]{3,})/i);
  const cupomTag = matchTag ? matchTag[1].toUpperCase() : undefined;

  // 1. Tenta achar desconto percentual (ex: "10% OFF", "com 15% de desconto", "cupom 10%", "economize 5%")
  const matchPct = texto.match(/(\d{1,2})%\s*(?:off|de\s*desconto|no\s*cupom|com\s*cupom)/i) ||
    texto.match(/(?:cupom|desconto|economize|salve)\s*(?:de\s*)?(\d{1,2})%/i);
  const percentualDesconto = matchPct ? parseInt(matchPct[1], 10) : undefined;

  // 2. Tenta achar desconto em valor fixo (ex: "Cupom de R$ 200", "R$ 300 OFF", "Economize R$ 300 com cupom")
  const matchValor = texto.match(/(?:cupom|desconto|economize|salve)\s*(?:de\s*)?R\$\s*([\d.]+,\d{2}|\d+)/i) ||
    texto.match(/R\$\s*([\d.]+,\d{2}|\d+)\s*(?:off|de\s*desconto|com\s*cupom|no\s*cupom)/i);
  let cupomDesconto: number | undefined;
  if (matchValor) {
    const val = extrairPreco(matchValor[1]);
    if (val > 0 && val < 5000) {
      cupomDesconto = val;
    }
  }

  return {
    cupomTag: cupomTag || (percentualDesconto || cupomDesconto ? 'CUPOM' : undefined),
    cupomDesconto,
    percentualDesconto,
  };
}

export function calcularPrecoComCupom(
  precoBase: number,
  cupomInfo: { cupomTag?: string; cupomDesconto?: number; percentualDesconto?: number }
): { cupomTag?: string; cupomDesconto?: number; precoComCupom?: number } {
  let desconto = cupomInfo.cupomDesconto;

  if (!desconto && cupomInfo.percentualDesconto && cupomInfo.percentualDesconto > 0) {
    desconto = Math.round((precoBase * (cupomInfo.percentualDesconto / 100)) * 100) / 100;
  }

  if (desconto && desconto > 0) {
    const precoFinal = Math.max(0, Math.round((precoBase - desconto) * 100) / 100);
    return {
      cupomTag: cupomInfo.cupomTag || 'CUPOM',
      cupomDesconto: desconto,
      precoComCupom: precoFinal,
    };
  }

  return {
    cupomTag: cupomInfo.cupomTag,
  };
}
