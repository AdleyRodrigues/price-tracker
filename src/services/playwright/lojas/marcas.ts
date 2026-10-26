import { Page } from 'playwright';
import { Oferta } from '../../../types/oferta';
import { ResultadoVerificacao } from '../types';

export async function verificarAsus(page: Page, oferta: Oferta): Promise<ResultadoVerificacao> {
  await page.goto(oferta.url, { waitUntil: 'domcontentloaded', timeout: 15000 });

  const esgotado = await page
    .locator('text=/esgotado|indisponível|out of stock|avise-me/i')
    .first()
    .isVisible()
    .catch(() => false);

  if (esgotado) {
    return {
      oferta,
      valida: false,
      motivo: 'Produto indisponível / esgotado na Loja Oficial ASUS',
    };
  }

  return {
    oferta,
    valida: true,
    precoConfirmado: oferta.precoAVista,
    precoParceladoConfirmado: oferta.precoParcelado,
    detalhesParcelamentoConfirmado: oferta.detalhesParcelamento,
  };
}

export async function verificarMagalu(page: Page, oferta: Oferta): Promise<ResultadoVerificacao> {
  return {
    oferta,
    valida: true,
    precoConfirmado: oferta.precoAVista,
    precoParceladoConfirmado: oferta.precoParcelado,
    detalhesParcelamentoConfirmado: oferta.detalhesParcelamento,
  };
}

export async function verificarLg(page: Page, oferta: Oferta): Promise<ResultadoVerificacao> {
  await page.goto(oferta.url, { waitUntil: 'domcontentloaded', timeout: 15000 });

  const esgotado = await page
    .locator('text=/produto indisponível|esgotado|out of stock/i')
    .first()
    .isVisible()
    .catch(() => false);

  if (esgotado) {
    return {
      oferta,
      valida: false,
      motivo: 'Produto indisponível / esgotado na Loja Oficial LG',
    };
  }

  return {
    oferta,
    valida: true,
    precoConfirmado: oferta.precoAVista,
  };
}
