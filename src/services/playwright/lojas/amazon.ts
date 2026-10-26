import { Page } from 'playwright';
import { extrairPreco, formatBRL } from '../../../lib/preco';
import { Oferta } from '../../../types/oferta';
import { calcularPrecoComCupom, extrairInformacoesCupom } from '../../../domain/filtros';
import { ResultadoVerificacao } from '../types';

export async function verificarAmazon(page: Page, oferta: Oferta): Promise<ResultadoVerificacao> {
  await page.goto(oferta.url, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // 1. Checa indisponibilidade
  const indisponivel = await page
    .locator('#availability:has-text("Não disponível"), #availability:has-text("Atualmente indisponível"), #outOfStock')
    .first()
    .isVisible()
    .catch(() => false);

  if (indisponivel) {
    return {
      oferta,
      valida: false,
      motivo: 'Produto indisponível / fora de estoque na Amazon',
    };
  }

  // 2. Extrai preço renderizado no buybox
  const seletorPreco =
    '#corePrice_feature_div .a-offscreen, .apex-pricetopay-value .a-offscreen, #corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen, .priceToPay .a-offscreen';
  const textoPreco = await page
    .locator(seletorPreco)
    .first()
    .innerText()
    .catch(() => '');

  let precoConfirmado = oferta.precoAVista;
  const match = textoPreco.match(/R\$\s*[\d.]+,\d{2}/);
  if (match) {
    const extraido = extrairPreco(match[0]);
    if (extraido > 0) precoConfirmado = extraido;
  }

  // 3. Extrai parcelamento da página
  const textoContainer = await page
    .locator('#centerCol, #apex_desktop, #corePrice_desktop')
    .first()
    .innerText()
    .catch(() => '');

  let precoParceladoConfirmado = oferta.precoParcelado;
  let detalhesParcelamentoConfirmado = oferta.detalhesParcelamento;

  const matchParc = textoContainer.match(
    /(?:em\s+at[ée]\s+)?(\d{1,2})x\s*(?:de\s*)?R\$\s*([\d.]+,\d{2})(?:\s*sem\s*juros)?/i
  );
  if (matchParc) {
    const qtd = parseInt(matchParc[1], 10);
    const vParc = extrairPreco(matchParc[2]);
    detalhesParcelamentoConfirmado = `${qtd}x de ${formatBRL(vParc)} sem juros`;
    precoParceladoConfirmado = Math.round(qtd * vParc * 100) / 100;
  }

  // 4. Extrai cupom clip da página
  const textoCupom = await page
    .locator('#couponBadge, [data-csa-c-coupon-type], .promoPriceBlockMessage, [id*="coupon"]')
    .first()
    .innerText()
    .catch(() => '');

  const cupomInfo = extrairInformacoesCupom(textoCupom);
  const calculoCupom = calcularPrecoComCupom(precoConfirmado, cupomInfo);

  return {
    oferta,
    valida: true,
    precoConfirmado,
    precoParceladoConfirmado,
    detalhesParcelamentoConfirmado,
    cupomTagConfirmado: calculoCupom.cupomTag || oferta.cupomTag,
    cupomDescontoConfirmado: calculoCupom.cupomDesconto || oferta.cupomDesconto,
    precoComCupomConfirmado:
      calculoCupom.precoComCupom !== undefined ? calculoCupom.precoComCupom + oferta.frete : oferta.precoComCupom,
  };
}
