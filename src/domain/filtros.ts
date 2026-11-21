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

/**
 * Séries reconhecidas no histórico: TUF F16/A16, Avell, LOQ, Nitro, V16,
 * Dell G15/G16, Alienware m16/x16, Gigabyte AORUS/G6.
 */
const SERIE_NOTEBOOK =
  /\b(f16|a16|fx608|fx607|fa607|fa608|storm|ion|loq|anv16|nitro|v16|v3607|g15|g16|m16|x16|aorus|g6kf|g6)\b/i;

/**
 * Fora do escopo = ASUS premium (ROG Strix, Zephyrus, TUF G16/M16) e PNs associados.
 * NÃO bloqueia Dell G16 / Alienware m16 (coletados como premium).
 */
export const SERIE_FORA_ESCOPO =
  /(?:\brog\s*strix\b|\bstrix\s*g\s*16\b|\bzephyrus\b|\btuf\s*gaming\s*[gm]\s*16\b|\bg614\b|\bg615\b|\bg634\b|\bg814\b|\bgu604\b|\bgu605\b|\bgu606\b)/i;

/** Chaves ASUS-style (sem prefixo dell_/alienware_) que nunca entram. */
export const CHAVE_FORA_ESCOPO =
  /^(g16|m16|g614|g615|g634|g814|gu604|gu605|gu606|gx|gz)([_-]|$)/i;

/** Part numbers ASUS que não são F16/A16. */
const PN_FORA_ESCOPO = /^(g6|gu|m6|gx|gz)/i;
const PN_F16_A16 = /^(fx608|fx607|fa607|fa608)/i;

function ehDellAlienOuGigabyte(texto: string, chave?: string | null): boolean {
  if (/^(dell_|alienware_|gigabyte_)/i.test(chave ?? '')) return true;
  return /\b(dell|alienware|gigabyte|aorus)\b/i.test(texto);
}

/** True se título/SKU/chave for ASUS premium fora do monitoramento. */
export function ehSerieForaEscopo(texto: string, chave?: string | null): boolean {
  const t = `${texto} ${chave ?? ''}`.trim();
  if (!t) return false;
  if (chave && CHAVE_FORA_ESCOPO.test(chave.trim())) return true;
  if (SERIE_FORA_ESCOPO.test(t)) return true;
  // PN solto no texto (G615JM, GU605…)
  if (/\b(g6(?:14|15|34)|g814|gu60[456])[a-z0-9]*\b/i.test(t)) return true;
  // G16/M16 só bloqueia no contexto ASUS (não Dell/Alienware)
  if (
    !ehDellAlienOuGigabyte(t, chave) &&
    /\b(?:asus|rog|tuf)\b/i.test(t) &&
    /\b[gm]\s*16\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

/** Sufixo de GPU para chaves premium (ex.: rtx4060). */
function gpuChaveDeTexto(texto: string): string {
  const m = texto.match(/\b(?:rtx\s*)?(4060|5050|5060)\b/i);
  return m?.[1] ? `rtx${m[1]}` : 'gpu';
}

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

function ehSeriePermitida(texto: string, chave?: string | null): boolean {
  if (ehSerieForaEscopo(texto, chave)) return false;
  if (chave) {
    if (PN_FORA_ESCOPO.test(chave) && !/^gigabyte_/i.test(chave)) return false;
    if (
      PN_F16_A16.test(chave) ||
      /^(f16|a16|avell|loq|anv16|asus_v3607|dell_|alienware_|gigabyte_)/i.test(chave)
    ) {
      return true;
    }
  }
  return (
    /\b(f16|a16|fx608|fx607|fa607|fa608|storm|ion|loq|anv16|nitro|v16|v3607)\b/i.test(texto) ||
    /tuf\s+gaming\s+(f16|a16)\b/i.test(texto) ||
    /avell\s+(storm|ion)/i.test(texto) ||
    /lenovo\s+loq/i.test(texto) ||
    /acer\s+nitro/i.test(texto) ||
    (/\bdell\b/i.test(texto) && /\bg\s*1[56]\b/i.test(texto)) ||
    (/alienware/i.test(texto) && /\b[mx]\s*16\b/i.test(texto)) ||
    (/\b(gigabyte|aorus)\b/i.test(texto) && /\b(aorus\s*16|\ba16\b|g6kf|g6)\b/i.test(texto))
  );
}

// Retrocompatibilidade
const ehSerieF16OuA16 = ehSeriePermitida;

/**
 * Chave de histórico por modelo/SKU (1 linha no dash por notebook).
 * Inclui Dell G15/G16, Alienware m16/x16 e Gigabyte AORUS/G6 (premium no dash).
 */
export function identificarProdutoChaveNotebook(
  titulo: string,
  sku?: string
): string | null {
  const texto = `${titulo} ${sku ?? ''}`;
  if (ehSerieForaEscopo(texto, sku)) return null;

  // 1. Avell Storm 560 / ION A70
  if (/storm\s*560/i.test(texto)) return 'avell_storm560_rtx5060';
  if (/ion\s*a70/i.test(texto)) return 'avell_iona70_rtx5060';

  // 2. Lenovo LOQ 15 / 16
  if (/loq/i.test(texto)) {
    const pnLoq = texto.match(/\b(15[a-z]{3}\d|16[a-z]{3}\d)\b/i)?.[1]?.toLowerCase();
    if (pnLoq) return `loq_${pnLoq}`;
    if (/\bloq\s*15\b|\b15(?:\.6)?\s*(?:"|pol)/i.test(texto)) return 'loq_15_rtx5060';
    if (/\bloq\s*16\b|\b16(?:\.0)?\s*(?:"|pol)/i.test(texto)) return 'loq_16_rtx5060';
    return 'loq_15_rtx5060';
  }

  // 3. Acer Nitro V16
  if (/nitro\s*v16|anv16/i.test(texto)) {
    const pnNitro = texto.match(/\b(anv16-\d{2}[a-z]?)\b/i)?.[1]?.toLowerCase().replace('-', '_');
    if (pnNitro) return pnNitro;
    return 'anv16_rtx5060';
  }

  // 4. Dell G15 / G16
  if (/\bdell\b/i.test(texto) && /\bg\s*16\b/i.test(texto)) {
    return `dell_g16_${gpuChaveDeTexto(texto)}`;
  }
  if (/\bdell\b/i.test(texto) && /\bg\s*15\b/i.test(texto)) {
    return `dell_g15_${gpuChaveDeTexto(texto)}`;
  }

  // 5. Alienware m16 / x16
  if (/alienware/i.test(texto) && /\bm\s*16\b/i.test(texto)) {
    return `alienware_m16_${gpuChaveDeTexto(texto)}`;
  }
  if (/alienware/i.test(texto) && /\bx\s*16\b/i.test(texto)) {
    return `alienware_x16_${gpuChaveDeTexto(texto)}`;
  }

  // 6. Gigabyte AORUS 16 / A16 / G6 (antes do ASUS A16 — evita colisão de chave)
  if (/\bgigabyte\b/i.test(texto) || /\baorus\b/i.test(texto)) {
    if (/aorus\s*16|\ba16\b/i.test(texto)) {
      return `gigabyte_aorus16_${gpuChaveDeTexto(texto)}`;
    }
    if (/\bg6(?:kf)?\b/i.test(texto)) {
      return `gigabyte_g6_${gpuChaveDeTexto(texto)}`;
    }
  }

  // 7. ASUS Gaming V16 (V3607)
  if (/v3607vh|gaming\s*v16|\bv16\b/i.test(texto) && !/nitro/i.test(texto)) {
    return 'asus_v3607_rtx5060';
  }

  // 5. ASUS TUF Part number no SKU ou título
  let chave: string | null = null;

  if (sku && !ehAsinAmazon(sku)) {
    const doSku =
      extrairPartNumberAsus(sku) ??
      (/^[A-Z]{2}\d{3}[A-Z]{2,5}$/i.test(sku.trim())
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
        : serieRaw === 'fa607' || serieRaw === 'fa608'
          ? 'a16'
          : serieRaw;
    const gpu = hw.gpu?.toLowerCase().replace(/\s+/g, '') ?? null;
    const ram = hw.ram?.match(/\d+/)?.[0] ?? null;

    if (!serie && !gpu) return null;

    chave = [serie ?? 'notebook', gpu ?? 'gpu', ram ? `${ram}gb` : null].filter(Boolean).join('_');
  }

  if (ehSerieForaEscopo(texto, chave) || !ehSeriePermitida(texto, chave)) return null;
  return chave;
}

/** Label amigável: nome comercial · CPU · RAM · GPU (nunca part number tipo FX608…). */
export function labelProdutoNotebook(chave: string, tituloHint?: string): string {
  const nome = nomeSerieNotebook(chave, tituloHint);

  if (!tituloHint) {
    const ram = formatarRam(resolverRamNotebook({ chave })).replace(' RAM', '');
    if (chave === 'avell_storm560_rtx5060') return `${nome} · 16 GB · RTX 5060`;
    if (chave === 'avell_iona70_rtx5060') return `${nome} · 16 GB · RTX 5060`;
    if (chave.startsWith('loq_')) return `${nome} · 16 GB · RTX 5060`;
    if (chave.startsWith('anv16')) return `${nome} · 16 GB · RTX 5060`;
    if (chave.startsWith('asus_v3607')) return `${nome} · 16 GB · RTX 5060`;
    if (/^(dell_|alienware_|gigabyte_)/i.test(chave)) {
      const gpuChave = chave.match(/rtx(\d{4})/i)?.[1];
      const gpu = gpuChave ? `RTX ${gpuChave}` : null;
      return [nome, ram, gpu].filter(Boolean).join(' · ');
    }
    const gpuChave = chave.match(/rtx\s*(\d{4})/i)?.[1];
    const gpu = gpuChave ? `RTX ${gpuChave}` : null;
    return [nome, ram, gpu].filter(Boolean).join(' · ');
  }

  const hw = extrairHardware(tituloHint);
  const partes = [nome];
  if (hw.cpu) partes.push(hw.cpu);
  partes.push(formatarRam(resolverRamNotebook({ titulo: tituloHint, chave })).replace(' RAM', ''));
  if (hw.gpu) partes.push(hw.gpu);
  return partes.join(' · ');
}

/** Nome comercial da série a partir da chave/título (sem part number). */
function nomeSerieNotebook(chave: string, tituloHint?: string): string {
  const texto = `${chave} ${tituloHint ?? ''}`;
  if (/storm\s*560/i.test(texto)) return 'Avell Storm 560';
  if (/ion\s*a70/i.test(texto)) return 'Avell ION A70';
  if (/loq/i.test(texto)) return 'Lenovo LOQ';
  if (/nitro\s*v16|anv16/i.test(texto)) return 'Acer Nitro V16';
  if (/dell_g16|dell\s+g\s*16/i.test(texto)) return 'Dell G16';
  if (/dell_g15|dell\s+g\s*15/i.test(texto)) return 'Dell G15';
  if (/alienware_m16|alienware\s+m\s*16/i.test(texto)) return 'Alienware m16';
  if (/alienware_x16|alienware\s+x\s*16/i.test(texto)) return 'Alienware x16';
  if (/aorus16|aorus\s*16/i.test(texto)) return 'Gigabyte AORUS 16';
  if (
    /^gigabyte_g6/i.test(chave) ||
    (/\b(gigabyte|aorus)\b/i.test(texto) && /\bg6(?:kf)?\b/i.test(texto))
  ) {
    return 'Gigabyte G6';
  }
  if (/v16|v3607/i.test(texto)) return 'ASUS Gaming V16';
  if (/^(fx608|fx607)|^f16_/i.test(chave) || /\b(f16|fx608|fx607)\b/i.test(texto)) return 'ASUS TUF Gaming F16';
  if (/^(fa607|fa608)|^a16_/i.test(chave) || /\b(a16|fa607|fa608)\b/i.test(texto)) return 'ASUS TUF Gaming A16';
  return 'Notebook Gamer';
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

  // 0. ASUS premium (ROG Strix / Zephyrus / TUF G16) — Dell/Alienware passam
  if (ehSerieForaEscopo(textoCompleto, sku)) return true;

  // 1. Bloqueios explícitos (desktop, pc gamer, placa de video, gpu, mesa, suporte, cooler, gabinete, fonte, monitor, teclado, usado)
  // Ignora menções legítimas a teclado embutido de notebook (ex: "teclado iluminado")
  const textoParaBloqueio = textoCompleto.replace(/teclado\s+(?:iluminado|retroiluminado|rgb|abnt\d?|chiclet)/gi, '');
  if (TITULO_BLOQUEADO.test(textoParaBloqueio)) return true;

  // 2. Exige obrigatoriamente que seja notebook ou laptop
  if (!VALIDA_NOTEBOOK.test(textoCompleto)) return true;

  // 3. Marca permitida (ASUS / Avell / Lenovo / Acer / Dell / Alienware / Gigabyte)
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
