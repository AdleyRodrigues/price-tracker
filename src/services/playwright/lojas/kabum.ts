import { Page } from 'playwright';
import { extrairPreco } from '../../../lib/preco';
import { Oferta } from '../../../types/oferta';
import { ResultadoVerificacao } from '../types';

export async function verificarKabum(page: Page, oferta: Oferta): Promise<ResultadoVerificacao> {
  await page.goto(oferta.url, { waitUntil: 'domcontentloaded', timeout: 15000 });

  const esgotado = await page
    .locator('text=/produto indisponível|esgotado|avise-me quando chegar|ops! produto indisponível/i')
    .first()
    .isVisible()
    .catch(() => false);

  if (esgotado) {
    return {
      oferta,
      valida: false,
      motivo: 'Produto indisponível / esgotado no KaBuM!',
    };
  }

  // Tenta checar preço atualizado na página
  const precoTexto = await page
    .locator('h4:has-text("R$"), [data-testid="price-value"], .preco_desconto, .finalPrice')
    .first()
    .innerText()
    .catch(() => '');

  let precoConfirmado = oferta.precoAVista;
  const match = precoTexto.match(/R\$\s*[\d.]+,\d{2}/);
  if (match) {
    const extraido = extrairPreco(match[0]);
    if (extraido > 0) precoConfirmado = extraido;
  }

  return {
    oferta,
    valida: true,
    precoConfirmado,
    precoParceladoConfirmado: oferta.precoParcelado,
    detalhesParcelamentoConfirmado: oferta.detalhesParcelamento,
  };
}
