import { describe, expect, it } from 'vitest';
import { menorCustoReal, ordenarPorTotal, podio } from '../src/domain/ranking';
import { Oferta } from '../src/types/oferta';

describe('ranking domain', () => {
  const ofertas: Oferta[] = [
    {
      loja: 'Loja Oficial',
      titulo: 'Notebook Gamer ASUS TUF A15 RTX 4060',
      precoAVista: 5200.0,
      frete: 100.0,
      precoTotal: 5300.0,
      url: 'https://example.com/1',
    },
    {
      loja: 'Amazon',
      titulo: 'Notebook Gamer ASUS TUF A15 RTX 4060',
      precoAVista: 5100.0,
      frete: 0,
      precoTotal: 5100.0,
      url: 'https://www.amazon.com.br/dp/B0ASUSTUF1',
    },
    {
      loja: 'Comunidade (Promobit)',
      titulo: 'Notebook Gamer ASUS TUF A16 RTX 5050',
      precoAVista: 5500.0,
      frete: 50.0,
      precoTotal: 5550.0,
      cupomTag: 'TUF10',
      precoComCupom: 4950.0, // Com cupom fica o mais barato!
      url: 'https://www.promobit.com.br/oferta/tuf-a16',
    },
  ];

  it('ordena ofertas pelo menor custo real considerando descontos de cupons', () => {
    const ordenadas = ordenarPorTotal(ofertas);
    // 1º lugar deve ser a oferta com cupom (R$ 4950)
    expect(ordenadas[0].loja).toBe('Comunidade (Promobit)');
    expect(menorCustoReal(ordenadas[0])).toBe(4950.0);

    // 2º lugar deve ser Amazon (R$ 5100)
    expect(ordenadas[1].loja).toBe('Amazon');
    expect(ordenadas[1].precoTotal).toBe(5100.0);

    // 3º lugar deve ser Loja Oficial (R$ 5300)
    expect(ordenadas[2].loja).toBe('Loja Oficial');
    expect(ordenadas[2].precoTotal).toBe(5300.0);
  });

  it('extrai os primeiros lugares no pódio conforme tamanho solicitado', () => {
    const top2 = podio(ordenarPorTotal(ofertas), 2);
    expect(top2).toHaveLength(2);
    expect(top2[0].loja).toBe('Comunidade (Promobit)');
    expect(top2[1].loja).toBe('Amazon');
  });
});
