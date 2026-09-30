export interface Oferta {
  loja: string;
  titulo: string;
  precoTotal: number;
  precoAVista: number;
  precoParcelado?: number;
  detalhesParcelamento?: string;
  frete: number;
  url: string;
  cupomTag?: string;
  cupomDesconto?: number;
  precoComCupom?: number;
  sku?: string;
  ehCompact?: boolean;
  fonteId?: string;
}

export interface OfertaBruta {
  loja: string;
  titulo: string;
  precoAVista: number;
  precoParcelado?: number;
  detalhesParcelamento?: string;
  frete: number;
  url: string;
  cupomTag?: string;
  cupomDesconto?: number;
  precoComCupom?: number;
  fonteId: string;
  sku?: string;
  ehCompact?: boolean;
}

export interface FonteScraper {
  id: string;
  coletar(): Promise<Oferta[]>;
}

export function toOferta(bruta: OfertaBruta): Oferta {
  const precoTotal = Math.round((bruta.precoAVista + bruta.frete) * 100) / 100;
  let precoComCupom = bruta.precoComCupom;

  if (!precoComCupom && bruta.cupomDesconto && bruta.cupomDesconto > 0) {
    precoComCupom = Math.max(0, Math.round((bruta.precoAVista - bruta.cupomDesconto + bruta.frete) * 100) / 100);
  }

  const oferta: Oferta = {
    loja: bruta.loja,
    titulo: bruta.titulo,
    precoAVista: bruta.precoAVista,
    frete: bruta.frete,
    precoTotal,
    url: bruta.url,
  };

  if (bruta.precoParcelado !== undefined) oferta.precoParcelado = bruta.precoParcelado;
  if (bruta.detalhesParcelamento) oferta.detalhesParcelamento = bruta.detalhesParcelamento;
  if (bruta.cupomTag) oferta.cupomTag = bruta.cupomTag;
  if (bruta.cupomDesconto !== undefined) oferta.cupomDesconto = bruta.cupomDesconto;
  if (precoComCupom !== undefined) oferta.precoComCupom = precoComCupom;
  if (bruta.sku) oferta.sku = bruta.sku;
  if (bruta.ehCompact) oferta.ehCompact = bruta.ehCompact;
  if (bruta.fonteId) oferta.fonteId = bruta.fonteId;

  return oferta;
}
