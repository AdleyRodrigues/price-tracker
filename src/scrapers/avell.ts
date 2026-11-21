import * as cheerio from 'cheerio';
import { CHROME_HEADERS, detalheErro, http } from '../config/http';
import { aceitarOferta } from '../domain/filtros';
import { extrairPreco, formatBRL } from '../lib/preco';
import { FonteScraper, Oferta, toOferta } from '../types/oferta';

const BASE = 'https://avell.com.br';

/** Páginas de listagem / busca da loja oficial (Storm + ION). */
export const AVELL_BUSCA_URLS = [
  `${BASE}/notebooks/gamer`,
  `${BASE}/notebooks/notebooks-linhas/gamers-linha-storm`,
  `${BASE}/busca?q=storm+560`,
  `${BASE}/busca?q=ion+a70`,
];

/** Só Storm 560 / ION A70 (escopo do tracker). Storm 550/570/etc. ficam de fora. */
const HREF_PRODUTO = /^\/((?:storm-560|ion-a\d+)-[\w-]+)$/i;

function absolutizar(href: string): string {
  const limpo = href.split('?')[0]!.trim();
  if (limpo.startsWith('http')) return limpo;
  return `${BASE}${limpo.startsWith('/') ? '' : '/'}${limpo}`;
}

function extrairPrecoPix(texto: string): number {
  const pix =
    texto.match(/R\$\s*([\d.]+,\d{2})\s*no\s*PIX/i) ||
    texto.match(/A partir de\s*R\$\s*([\d.]+,\d{2})/i) ||
    texto.match(/A partir deR\$\s*([\d.]+,\d{2})/i) ||
    texto.match(/R\$\s*([\d.]+,\d{2})/);
  return pix ? extrairPreco(pix[1]!) : Number.NaN;
}

function extrairParcelamento(texto: string): {
  precoParcelado?: number;
  detalhesParcelamento?: string;
} {
  const match = texto.match(/(\d{1,2})x\s*de\s*R\$\s*([\d.]+,\d{2})/i);
  if (!match) return {};
  const n = Number(match[1]);
  const parcela = extrairPreco(match[2]!);
  if (!Number.isFinite(parcela) || parcela <= 0 || n <= 0) return {};
  return {
    precoParcelado: Math.round(parcela * n * 100) / 100,
    detalhesParcelamento: `${n}x de ${formatBRL(parcela)}`,
  };
}

/** Monta título limpo (sem "Placa de Vídeo" / lixo do card) para passar nos filtros. */
export function montarTituloAvell(href: string, textoCard: string): string {
  const slug = href.replace(/^\//, '').toLowerCase();
  const texto = textoCard.replace(/\s+/g, ' ').trim();

  const modeloSlug =
    slug.match(/^(storm-\d+)/i)?.[1]?.replace(/-/g, ' ') ||
    slug.match(/^(ion-a\d+)/i)?.[1]?.replace(/-/g, ' ') ||
    '';

  const modeloTexto =
    texto.match(/Avell\s+(STORM\s*\d+|ION\s*A\d+)/i)?.[1] ||
    texto.match(/\b(STORM\s*\d+|ION\s*A\d+)\b/i)?.[1] ||
    '';

  const modelo = (modeloTexto || modeloSlug || 'Storm')
    .replace(/\s+/g, ' ')
    .trim();

  const gpuMatch =
    texto.match(/RTX\s*(\d{4})/i) || slug.match(/rtx\s*(\d{4})/i);
  const gpu = gpuMatch ? `RTX ${gpuMatch[1]}` : null;

  // Slug: ...-intel-core-i7-14650hx-rtx5060 → para antes de -rtx
  const cpuDoSlug = slug.match(
    /(?:intel-(?:core-)?(?:ultra-)?[\w-]+?)(?=-rtx)|(?:amd-ryzen-\d+(?:-\d+)?)(?=-rtx|$)/i
  )?.[0];
  const cpu =
    (cpuDoSlug
      ? cpuDoSlug
          .replace(/-/g, ' ')
          .replace(/\bamd\b/i, 'AMD')
          .replace(/\bintel\b/i, 'Intel')
          .replace(/\bcore\b/i, 'Core')
          .replace(/\bultra\b/i, 'Ultra')
          .replace(/\bryzen\b/i, 'Ryzen')
      : null) ||
    texto.match(
      /Intel\s+(?:Core\s+)?(?:Ultra\s+)?(?:i?[3579]|[CU]\d)[\w\-]*\s*\d{3,5}[A-Z]{0,2}/i
    )?.[0] ||
    texto.match(/Amd\s+Ryzen\s+\d+(?:\s+\d{2,4})?/i)?.[0] ||
    null;

  const tela =
    texto.match(
      /(\d{1,2}(?:[.,]\d)?['']?\s*(?:QHD\+?|FHD|UHD)(?:\+)?(?:\s*\d+\s*Hz)?)/i
    )?.[0] ||
    (/\b16['']|\b16\b.*(?:QHD|FHD)/i.test(texto) ? '16"' : null);

  const partes = ['Notebook Avell', modelo.replace(/\b\w/g, (c) => c.toUpperCase())];
  if (gpu) partes.push(gpu);
  if (cpu) partes.push(cpu.replace(/\s+/g, ' ').trim());
  partes.push('16GB');
  if (tela) partes.push(tela.replace(/\s+/g, ' ').trim());
  else if (/storm|ion/i.test(modelo)) partes.push('16"');

  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

export function parsearBuscaAvell(html: string): Oferta[] {
  const $ = cheerio.load(html);
  const candidatas: Oferta[] = [];
  const vistos = new Set<string>();

  $('a[href]').each((_, el) => {
    const rawHref = ($(el).attr('href') || '').split('?')[0]!.trim();
    const m = rawHref.match(HREF_PRODUTO);
    if (!m) return;

    const path = `/${m[1]}`;
    const url = absolutizar(path);
    if (vistos.has(url.toLowerCase())) return;

    const $a = $(el);
    const texto = $a.text().replace(/\s+/g, ' ').trim();
    // Cards sem preço (links órfãos no HTML) — pula
    if (!/R\$\s*[\d.]/i.test(texto)) return;

    const precoAVista = extrairPrecoPix(texto);
    if (!Number.isFinite(precoAVista) || precoAVista <= 0) return;

    vistos.add(url.toLowerCase());

    const { precoParcelado, detalhesParcelamento } = extrairParcelamento(texto);
    const titulo = montarTituloAvell(path, texto);
    const sku = m[1]!.toLowerCase();

    const oferta = toOferta({
      loja: 'Loja Oficial Avell',
      titulo,
      precoAVista,
      precoParcelado,
      detalhesParcelamento,
      frete: 0,
      url,
      fonteId: 'avell',
      sku,
    });

    if (aceitarOferta(oferta)) {
      console.log(
        `[Avell] ${oferta.titulo} => ${formatBRL(oferta.precoAVista)} (${url})`
      );
      candidatas.push(oferta);
    }
  });

  return candidatas;
}

async function rasparUrlAvell(url: string): Promise<Oferta[]> {
  try {
    const { data: html, status } = await http.get<string>(url, {
      headers: {
        ...CHROME_HEADERS,
        Referer: `${BASE}/`,
      },
      timeout: 20000,
      signal: AbortSignal.timeout(20000),
      validateStatus: () => true,
    });

    if (status >= 400 || typeof html !== 'string') {
      console.error(`[Avell] HTTP ${status} em ${url}`);
      return [];
    }

    return parsearBuscaAvell(html);
  } catch (err) {
    console.error(`[Avell] Falha em ${url}: ${detalheErro(err)}`);
    return [];
  }
}

export const avellScraper: FonteScraper = {
  id: 'avell',
  async coletar(): Promise<Oferta[]> {
    const todas: Oferta[] = [];

    for (const url of AVELL_BUSCA_URLS) {
      const ofertas = await rasparUrlAvell(url);
      todas.push(...ofertas);
    }

    const mapa = new Map<string, Oferta>();
    for (const o of todas) {
      const chave = o.url.trim().toLowerCase();
      const existente = mapa.get(chave);
      if (!existente || o.precoTotal < existente.precoTotal) {
        mapa.set(chave, o);
      }
    }

    return [...mapa.values()];
  },
};
