import { describe, expect, it } from 'vitest';
import {
  cupomAindaValido,
  economiaEstimada,
  escolherMelhorCupom,
  slugsParaLoja,
  type CupomAtivo,
} from '../src/services/cupons';

function cupom(partial: Partial<CupomAtivo> & Pick<CupomAtivo, 'code'>): CupomAtivo {
  return {
    title: partial.title ?? 'Teste',
    discountPercent: partial.discountPercent ?? null,
    discountFixed: partial.discountFixed ?? null,
    storeSlug: partial.storeSlug ?? 'amazon',
    storeName: partial.storeName ?? 'Amazon',
    expiresAt: partial.expiresAt ?? null,
    expiresAtBrt: partial.expiresAtBrt ?? null,
    conditions: partial.conditions ?? null,
    url: partial.url ?? 'https://cupomdescontos.com/ir/amazon',
    code: partial.code,
  };
}

describe('cupons', () => {
  it('mapeia lojas do pipeline para slugs', () => {
    expect(slugsParaLoja('KaBuM!')).toEqual(['kabum']);
    expect(slugsParaLoja('Mercado Livre')).toEqual(['mercado-livre']);
    expect(slugsParaLoja('Amazon')).toEqual(['amazon']);
  });

  it('valida expires_at', () => {
    expect(cupomAindaValido(cupom({ code: 'A', expiresAt: null }))).toBe(true);
    expect(
      cupomAindaValido(cupom({ code: 'B', expiresAt: '2099-01-01T00:00:00.000Z' }))
    ).toBe(true);
    expect(
      cupomAindaValido(cupom({ code: 'C', expiresAt: '2020-01-01T00:00:00.000Z' }))
    ).toBe(false);
  });

  it('escolhe o cupom com maior economia', () => {
    const lista = [
      cupom({ code: 'PCT5', discountPercent: 5 }),
      cupom({ code: 'FIX400', discountFixed: 400 }),
      cupom({ code: 'PCT3', discountPercent: 3 }),
    ];
    // 5% de 8000 = 400; empate com FIX400 — reduce pega o maior; 5% == 400, FIX400 também 400
    // 3% = 240 → FIX400 e PCT5 empatam em 400; preferimos o primeiro máximo estável
    const melhor = escolherMelhorCupom(lista, 5000);
    // 5% de 5000 = 250; FIX400 = 400 → vence o fixo
    expect(melhor?.code).toBe('FIX400');
    expect(economiaEstimada(melhor!, 5000)).toBe(400);
  });

  it('ignora cupons sem desconto utilizável', () => {
    expect(escolherMelhorCupom([cupom({ code: 'VAZIO' })], 7000)).toBeNull();
  });
});
