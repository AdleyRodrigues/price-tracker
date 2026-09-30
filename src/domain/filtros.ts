import {
  OFERTA_ENCERRADA,
  PRECO_MINIMO,
  TITULO_BLOQUEADO,
  VALIDA_GPU,
  VALIDA_LINHA_ASUS_TUF,
  VALIDA_NOTEBOOK,
} from '../config/regras';
import { Oferta } from '../types/oferta';
import { extrairPreco } from '../lib/preco';

export function tituloBloqueado(titulo: string, sku?: string): boolean {
  if (!titulo) return true;
  const textoCompleto = `${titulo} ${sku ?? ''}`;

  // 1. Bloqueios explícitos (desktop, pc gamer, placa de video, gpu, mesa, suporte, cooler, gabinete, fonte, monitor, teclado, usado)
  if (TITULO_BLOQUEADO.test(textoCompleto)) return true;

  // 2. Exige obrigatoriamente que seja notebook ou laptop
  if (!VALIDA_NOTEBOOK.test(textoCompleto)) return true;

  // 3. Exige obrigatoriamente que seja da linha ASUS TUF
  if (!VALIDA_LINHA_ASUS_TUF.test(textoCompleto)) return true;

  // 4. Exige obrigatoriamente que contenha GPU 4060, 5050 ou 5060
  if (!VALIDA_GPU.test(textoCompleto)) return true;

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
