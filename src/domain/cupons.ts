import * as cheerio from 'cheerio';
import { formatBRL } from '../lib/preco';
import { Oferta } from '../types/oferta';

export interface CupomRegra {
  codigo: string;
  lojaAlvo: string;
  tipo: 'percentual' | 'fixo';
  valor: number;
  aplicaSobre: 'subtotal' | 'avista';
  cumulativoPixPercentual?: number;
  descricao?: string;
  ativo?: boolean;
}

export interface ResultadoCupom {
  cupomTag: string;
  cupomDesconto: number;
  precoComCupom: number;
  precoParceladoComCupom: number;
  detalhesParcelamentoComCupom?: string;
  economiaTotalAVista: number;
}

export const CUPONS_VERIFICADOS: CupomRegra[] = [
  {
    codigo: 'A5US',
    lojaAlvo: 'asus',
    tipo: 'percentual',
    valor: 5,
    aplicaSobre: 'subtotal',
    cumulativoPixPercentual: 10,
    descricao: 'Cupom oficial Loja ASUS: 5% de desconto de tabela acumulado com 10% no Pix',
    ativo: true,
  },
];

export function calcularDescontoCupom(
  loja: string,
  precoParcelado: number | undefined,
  precoAVista: number,
  regraOuCodigo?: CupomRegra | string
): ResultadoCupom | null {
  if (!Number.isFinite(precoAVista) || precoAVista <= 0) return null;

  let regra: CupomRegra | undefined;
  if (typeof regraOuCodigo === 'object' && regraOuCodigo !== null) {
    regra = regraOuCodigo;
  } else if (typeof regraOuCodigo === 'string') {
    const code = regraOuCodigo.trim().toUpperCase();
    regra = CUPONS_VERIFICADOS.find(
      (c) => c.ativo !== false && c.codigo.toUpperCase() === code
    );
  } else {
    const lojaNorm = loja.toLowerCase();
    regra = CUPONS_VERIFICADOS.find(
      (c) => c.ativo !== false && (lojaNorm.includes(c.lojaAlvo.toLowerCase()) || c.lojaAlvo.toLowerCase().includes(lojaNorm))
    );
  }

  if (!regra || regra.ativo === false) return null;

  let subtotal = precoParcelado && precoParcelado > precoAVista ? precoParcelado : 0;
  if (subtotal <= 0) {
    if (regra.cumulativoPixPercentual && regra.cumulativoPixPercentual > 0) {
      const fatorPix = 1 - regra.cumulativoPixPercentual / 100;
      subtotal = Math.round((precoAVista / fatorPix) * 100) / 100;
    } else {
      subtotal = precoAVista;
    }
  }

  if (subtotal <= 0 || !Number.isFinite(subtotal)) return null;

  let cupomDesconto = 0;
  if (regra.tipo === 'percentual') {
    if (regra.valor <= 0 || regra.valor >= 100) return null;
    cupomDesconto = Math.round(subtotal * (regra.valor / 100) * 100) / 100;
  } else if (regra.tipo === 'fixo') {
    if (regra.valor <= 0 || regra.valor >= subtotal) return null;
    cupomDesconto = regra.valor;
  } else {
    return null;
  }

  const precoParceladoComCupom = Math.round((subtotal - cupomDesconto) * 100) / 100;
  if (precoParceladoComCupom <= 0) return null;

  let precoAVistaComCupom = precoParceladoComCupom;
  if (regra.cumulativoPixPercentual && regra.cumulativoPixPercentual > 0) {
    const fatorPix = 1 - regra.cumulativoPixPercentual / 100;
    precoAVistaComCupom = Math.round(precoParceladoComCupom * fatorPix * 100) / 100;
  }

  if (precoAVistaComCupom >= precoAVista) {
    return null;
  }

  const economiaTotalAVista = Math.round((precoAVista - precoAVistaComCupom) * 100) / 100;

  let parcelasTexto: string | undefined;
  if (loja.toLowerCase().includes('asus')) {
    const qtd = 18;
    const vParc = Math.round((precoParceladoComCupom / qtd) * 100) / 100;
    parcelasTexto = `até ${qtd}x de ${formatBRL(vParc)} sem juros`;
  }

  return {
    cupomTag: regra.codigo,
    cupomDesconto,
    precoComCupom: precoAVistaComCupom,
    precoParceladoComCupom,
    detalhesParcelamentoComCupom: parcelasTexto,
    economiaTotalAVista,
  };
}

export function aplicarCupomEmOferta(
  oferta: Oferta,
  regraOuCodigo?: CupomRegra | string
): Oferta {
  const res = calcularDescontoCupom(
    oferta.loja,
    oferta.precoParcelado,
    oferta.precoAVista,
    regraOuCodigo ?? oferta.cupomTag
  );

  if (!res) {
    return oferta;
  }

  const nova: Oferta = {
    ...oferta,
    cupomTag: res.cupomTag,
    cupomDesconto: res.cupomDesconto,
    precoComCupom: res.precoComCupom,
  };

  if (res.precoParceladoComCupom) {
    nova.precoParceladoComCupom = res.precoParceladoComCupom;
  }
  if (res.detalhesParcelamentoComCupom) {
    nova.detalhesParcelamentoComCupom = res.detalhesParcelamentoComCupom;
  }

  return nova;
}

export function extrairCuponsQNC(html: string): CupomRegra[] {
  const $ = cheerio.load(html);
  const cupons: CupomRegra[] = [];
  const vistos = new Set<string>();

  $('.all-prices-item, .has-coupon, .item-oferta, article').each((_, el) => {
    const $el = $(el);
    const code = $el.find('.coupon-code').first().text().trim();
    if (!code) return;

    const storeEl = $el.find('.store').first();
    const storeClass = storeEl.attr('class') || '';
    const matchStore = storeClass.match(/store\s+([a-z0-9_-]+)/i);
    const lojaNome = matchStore ? matchStore[1].toLowerCase() : '';

    const chave = `${lojaNome}_${code}`.toUpperCase();
    if (vistos.has(chave)) return;
    vistos.add(chave);

    if (code.toUpperCase() === 'A5US' && (lojaNome === 'asus' || lojaNome === '')) {
      cupons.push({
        codigo: 'A5US',
        lojaAlvo: 'asus',
        tipo: 'percentual',
        valor: 5,
        aplicaSobre: 'subtotal',
        cumulativoPixPercentual: 10,
        descricao: 'Cupom QNC para Loja ASUS (5% OFF + 10% Pix)',
        ativo: true,
      });
    } else {
      const matchFixo = code.match(/^(\d+)\s*OFF$/i);
      if (matchFixo) {
        cupons.push({
          codigo: code,
          lojaAlvo: lojaNome || 'geral',
          tipo: 'fixo',
          valor: Number(matchFixo[1]),
          aplicaSobre: 'subtotal',
          descricao: `Cupom QNC ${code}`,
          ativo: true,
        });
      }
    }
  });

  return cupons;
}
