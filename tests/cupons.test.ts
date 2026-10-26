import { describe, expect, it } from 'vitest';
import {
  CUPONS_VERIFICADOS,
  aplicarCupomEmOferta,
  calcularDescontoCupom,
  extrairCuponsQNC,
} from '../src/domain/cupons';
import { menorCustoReal, ordenarPorTotal } from '../src/domain/ranking';
import { Oferta } from '../src/types/oferta';

describe('Gestão e Aplicação de Cupons Rigorosa', () => {
  it('calcula desconto exato centesimal para ASUS TUF F16 RTX 5060 (subtotal R$ 8.999,00)', () => {
    // Caso real comprovado pelo print do usuário:
    // Subtotal: R$ 8.999,00 -> Cupom A5US (5% = -R$ 449,95) -> R$ 8.549,05 -> Pix (10% extra) = R$ 7.694,15
    const res = calcularDescontoCupom('Loja Oficial ASUS', 8999, 8099.10, 'A5US');

    expect(res).not.toBeNull();
    expect(res!.cupomTag).toBe('A5US');
    expect(res!.cupomDesconto).toBe(449.95);
    expect(res!.precoParceladoComCupom).toBe(8549.05);
    expect(res!.precoComCupom).toBe(7694.15);
    expect(res!.economiaTotalAVista).toBe(404.95);
    expect(res!.detalhesParcelamentoComCupom).toMatch(/18x\s*de\s*R\$\s*474,95\s*sem\s*juros/);
  });

  it('calcula desconto exato centesimal para ASUS TUF F16 RTX 5050 (subtotal R$ 7.999,00)', () => {
    // Caso real comprovado pelo print do usuário:
    // Subtotal: R$ 7.999,00 -> Cupom A5US (5% = -R$ 399,95) -> R$ 7.599,05 -> Pix (10% extra) = R$ 6.839,15
    const res = calcularDescontoCupom('Loja Oficial ASUS', 7999, 7199.10, 'A5US');

    expect(res).not.toBeNull();
    expect(res!.cupomTag).toBe('A5US');
    expect(res!.cupomDesconto).toBe(399.95);
    expect(res!.precoParceladoComCupom).toBe(7599.05);
    expect(res!.precoComCupom).toBe(6839.15);
    expect(res!.economiaTotalAVista).toBe(359.95);
    expect(res!.detalhesParcelamentoComCupom).toMatch(/18x\s*de\s*R\$\s*422,17\s*sem\s*juros/);
  });

  it('infere subtotal com precisão centesimal quando precoParcelado não estiver disponível', () => {
    // Na Loja ASUS, R$ 8.099,10 já é com 10% de Pix
    const res = calcularDescontoCupom('Loja Oficial ASUS', undefined, 8099.10);

    expect(res).not.toBeNull();
    expect(res!.cupomTag).toBe('A5US');
    expect(res!.precoComCupom).toBe(7694.15);
  });

  it('protege contra valores inválidos, zero, negativos ou NaN', () => {
    expect(calcularDescontoCupom('Loja Oficial ASUS', 0, 0)).toBeNull();
    expect(calcularDescontoCupom('Loja Oficial ASUS', -100, -100)).toBeNull();
    expect(calcularDescontoCupom('Loja Oficial ASUS', NaN, NaN)).toBeNull();
    expect(calcularDescontoCupom('Loja Oficial ASUS', 1000, 1000, {
      codigo: 'FAKE',
      lojaAlvo: 'asus',
      tipo: 'percentual',
      valor: 0,
      aplicaSobre: 'subtotal',
    })).toBeNull();
  });

  it('enriquece a oferta com os dados de cupom usando aplicarCupomEmOferta', () => {
    const ofertaOriginal: Oferta = {
      loja: 'Loja Oficial ASUS',
      titulo: 'Notebook ASUS TUF Gaming F16 RTX 5060',
      precoAVista: 8099.10,
      precoParcelado: 8999,
      precoTotal: 8099.10,
      frete: 0,
      url: 'https://br.store.asus.com/tuf-f16-rtx-5060.html',
    };

    const enriquecida = aplicarCupomEmOferta(ofertaOriginal);

    expect(enriquecida.cupomTag).toBe('A5US');
    expect(enriquecida.cupomDesconto).toBe(449.95);
    expect(enriquecida.precoComCupom).toBe(7694.15);
    expect(enriquecida.precoParcelado).toBe(8999);
    expect(enriquecida.precoParceladoComCupom).toBe(8549.05);
  });

  it('extrai cupons dinamicamente a partir do HTML do Qual Notebook Comprar (QNC)', () => {
    const htmlMock = `
      <div class="all-prices-item">
        <div class="store asus"></div>
        <p class="coupon-code">A5US</p>
      </div>
      <div class="all-prices-item">
        <div class="store mercadolivre"></div>
        <p class="coupon-code">600 OFF</p>
      </div>
    `;

    const cupons = extrairCuponsQNC(htmlMock);

    expect(cupons.length).toBe(2);
    const cupomAsus = cupons.find((c) => c.codigo === 'A5US');
    expect(cupomAsus).toBeDefined();
    expect(cupomAsus!.tipo).toBe('percentual');
    expect(cupomAsus!.valor).toBe(5);
    expect(cupomAsus!.cumulativoPixPercentual).toBe(10);

    const cupomMl = cupons.find((c) => c.codigo === '600 OFF');
    expect(cupomMl).toBeDefined();
    expect(cupomMl!.tipo).toBe('fixo');
    expect(cupomMl!.valor).toBe(600);
  });

  it('garante que menorCustoReal e ordenarPorTotal priorizam o preço com cupom', () => {
    const semCupom: Oferta = {
      loja: 'Mercado Livre',
      titulo: 'Notebook ASUS TUF F16 RTX 5060',
      precoAVista: 7899,
      precoTotal: 7899,
      frete: 0,
      url: 'https://ml.com/tuf',
    };

    const comCupom: Oferta = {
      loja: 'Loja Oficial ASUS',
      titulo: 'Notebook ASUS TUF F16 RTX 5060',
      precoAVista: 8099.10,
      precoTotal: 8099.10,
      precoComCupom: 7694.15,
      cupomTag: 'A5US',
      frete: 0,
      url: 'https://asus.com/tuf',
    };

    expect(menorCustoReal(comCupom)).toBe(7694.15);
    expect(menorCustoReal(semCupom)).toBe(7899.00);

    const ordenadas = ordenarPorTotal([semCupom, comCupom]);
    expect(ordenadas[0].loja).toBe('Loja Oficial ASUS');
    expect(ordenadas[0].precoComCupom).toBe(7694.15);
  });
});
