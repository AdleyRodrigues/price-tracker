import { Page } from 'playwright';
import { extrairPreco } from '../../../lib/preco';
import { Oferta } from '../../../types/oferta';
import { ResultadoVerificacao } from '../types';

export async function verificarPromobit(page: Page, oferta: Oferta): Promise<ResultadoVerificacao> {
  await page.goto(oferta.url, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // 1. Checa se o botão ou badge de oferta encerrada está visível
  const encerradaVisivel = await page
    .locator(
      'button:has-text("Oferta encerrada"), a:has-text("Oferta encerrada"), div:has-text("Oferta encerrada"), span:has-text("Oferta encerrada")'
    )
    .first()
    .isVisible()
    .catch(() => false);

  if (encerradaVisivel) {
    return {
      oferta,
      valida: false,
      motivo: 'Botão "Oferta encerrada" visível no frontend do Promobit',
    };
  }

  // 2. Checa se o botão de ação "Ir para a loja" / "Pegar promoção" está presente
  const botaoIrLoja = await page
    .locator(
      'button:has-text("Ir para a loja"), a:has-text("Ir para a loja"), a:has-text("Pegar promoção"), button:has-text("Pegar promoção")'
    )
    .first()
    .isVisible()
    .catch(() => false);

  const temAlerta = await page
    .locator('button:has-text("Ativar Alerta"), a:has-text("Ativar Alerta")')
    .first()
    .isVisible()
    .catch(() => false);

  if (!botaoIrLoja && temAlerta) {
    return {
      oferta,
      valida: false,
      motivo: 'Botão "Ir para a loja" ausente (oferta encerrada com apenas "Ativar Alerta")',
    };
  }

  // 3. Mantém o preço promocional real da oferta (já validado pela API do Promobit).
  let precoConfirmado = oferta.precoAVista;
  if (!precoConfirmado || precoConfirmado <= 0) {
    const precoTexto = await page
      .locator('span:not([class*="line-through"]):not(s):not(del)')
      .filter({ hasText: /R\$\s*[\d.]+,\d{2}/ })
      .first()
      .innerText()
      .catch(() => '');

    const match = precoTexto.match(/R\$\s*[\d.]+,\d{2}/);
    if (match) {
      const extraido = extrairPreco(match[0]);
      if (extraido > 0) precoConfirmado = extraido;
    }
  }

  return {
    oferta,
    valida: true,
    precoConfirmado,
    precoParceladoConfirmado: oferta.precoParcelado,
    detalhesParcelamentoConfirmado: oferta.detalhesParcelamento,
    cupomTagConfirmado: oferta.cupomTag,
    cupomDescontoConfirmado: oferta.cupomDesconto,
    precoComCupomConfirmado: oferta.precoComCupom,
  };
}
