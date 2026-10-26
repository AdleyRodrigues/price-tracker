import { Page } from 'playwright';
import { Oferta } from '../../../types/oferta';
import { ResultadoVerificacao } from '../types';

export async function verificarZoomBuscape(page: Page, oferta: Oferta): Promise<ResultadoVerificacao> {
  try {
    await page.goto(oferta.url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const esgotado = await page
      .locator('text=/ops! produto indisponível|esgotado|nenhuma oferta encontrada|fora de estoque/i')
      .first()
      .isVisible()
      .catch(() => false);

    if (esgotado) {
      return {
        oferta,
        valida: false,
        motivo: 'Produto indisponível / esgotado no comparador',
      };
    }

    return {
      oferta,
      valida: true,
      precoConfirmado: oferta.precoAVista,
      precoParceladoConfirmado: oferta.precoParcelado,
      detalhesParcelamentoConfirmado: oferta.detalhesParcelamento,
    };
  } catch {
    return {
      oferta,
      valida: true,
      precoConfirmado: oferta.precoAVista,
      precoParceladoConfirmado: oferta.precoParcelado,
      detalhesParcelamentoConfirmado: oferta.detalhesParcelamento,
    };
  }
}
