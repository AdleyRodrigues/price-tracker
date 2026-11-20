import { describe, expect, it } from 'vitest';
import {
  calcularDestaques4k,
  custoBeneficio4k,
  potencia4k,
  specsFromLabel,
} from '../dashboard/src/lib/custo-beneficio';

describe('Destaques 4K para TV via HDMI', () => {
  it('extrai specs corretamente de labels variados', () => {
    const s1 = specsFromLabel('FX608JMI · Core i5-14450HX · 16 GB · RTX 5060');
    expect(s1.gpu).toContain('RTX 5060');
    expect(s1.ramGb).toBe(16);
    expect(s1.cpu).toContain('Core i5');

    const s2 = specsFromLabel('Notebook ASUS TUF F16 RTX 5050 8GB RAM');
    expect(s2.gpu).toContain('RTX 5050');
    expect(s2.ramGb).toBe(8);
  });

  it('penaliza modelos com 8 GB RAM em jogos 4K', () => {
    const p16 = potencia4k({ gpu: 'RTX 5050', cpu: 'Core i5', ramGb: 16 });
    const p8 = potencia4k({ gpu: 'RTX 5050', cpu: 'Core i5', ramGb: 8 });
    expect(p8).toBeLessThan(p16);
    expect(p8 / p16).toBeCloseTo(0.78, 2);
  });

  it('calcula os 4 destaques para TV 4K a partir dos produtos do mercado', () => {
    const produtos = [
      {
        produtoChave: 'fx608jhi',
        label: 'FX608JHI · Core i5 · 16 GB · RTX 5050',
        menorPreco: 7649,
        lojaMenorPreco: 'Qual Notebook Comprar',
        urlMenorPreco: 'https://quenotebookcomprar.com.br/fx608jhi',
      },
      {
        produtoChave: 'fx608jhr',
        label: 'FX608JHR · Core i7-14650HX · 8 GB · RTX 5050',
        menorPreco: 8599,
        lojaMenorPreco: 'Qual Notebook Comprar',
        urlMenorPreco: 'https://quenotebookcomprar.com.br/fx608jhr',
      },
      {
        produtoChave: 'fx608jmi',
        label: 'FX608JMI · Core i5-14450HX · 16 GB · RTX 5060',
        menorPreco: 8499,
        lojaMenorPreco: 'Qual Notebook Comprar',
        urlMenorPreco: 'https://quenotebookcomprar.com.br/fx608jmi',
      },
    ];

    const destaques = calcularDestaques4k(produtos);
    expect(destaques).not.toBeNull();
    if (!destaques) return;

    // 1. Campeão de custo-benefício em 4K deve ser o FX608JMI (RTX 5060 + 16 GB)
    expect(destaques.campeao?.produtoChave).toBe('fx608jmi');
    expect(destaques.campeao?.preco).toBe(8499);
    expect(destaques.campeao?.potenciaPorMil).toBeGreaterThan(15);
    expect(destaques.campeao?.url).toBe('https://quenotebookcomprar.com.br/fx608jmi');

    // 2. Menor preço de entrada viável deve ser o FX608JHI (RTX 5050 + 16 GB)
    expect(destaques.menorEntrada?.produtoChave).toBe('fx608jhi');
    expect(destaques.menorEntrada?.preco).toBe(7649);

    // 3. Máxima potência deve ser o FX608JMI
    expect(destaques.maxPotencia?.produtoChave).toBe('fx608jmi');

    // 4. Alerta de 8 GB RAM deve flagrar o FX608JHR
    expect(destaques.alerta8gb).not.toBeNull();
    expect(destaques.alerta8gb?.ramGb).toBe(8);

    // 5. Suporte HDMI 2.1
    expect(destaques.hdmiInfo.versao).toBe('HDMI 2.1 FRL');
    expect(destaques.hdmiInfo.suporte).toContain('4K @ 120Hz');
  });
});
