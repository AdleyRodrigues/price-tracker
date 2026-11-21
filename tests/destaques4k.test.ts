import { describe, expect, it } from 'vitest';
import {
  BONUS_ESTABILIDADE_4K,
  calcularDestaques4k,
  calcularScore,
  custoBeneficio4k,
  potencia4k,
  specsFromLabel,
} from '../dashboard/src/lib/custo-beneficio';
import { classificarNotebook } from '../dashboard/src/lib/serie-notebook';
import { obterPerfilChassi } from '../src/domain/hardware-perfis';

describe('Destaques 4K para TV via HDMI', () => {
  it('extrai specs corretamente de labels variados', () => {
    const s1 = specsFromLabel('FX608JMI · Core i5-14450HX · 16 GB · RTX 5060', 'fx608jmi');
    expect(s1.gpu).toContain('RTX 5060');
    expect(s1.ramGb).toBe(16);
    expect(s1.cpu).toContain('Core i5');
    expect(s1.tgpWatts).toBe(115);

    const s2 = specsFromLabel('Notebook ASUS TUF F16 RTX 5050 8GB RAM', 'fx608jhr');
    expect(s2.gpu).toContain('RTX 5050');
    expect(s2.ramGb).toBe(8);
    expect(s2.tgpWatts).toBe(115);
  });

  it('TUF F16 + RTX 5060 é 115W (nunca 140W)', () => {
    expect(obterPerfilChassi('ASUS TUF Gaming F16 FX608JMI RTX 5060').tgpWatts).toBe(115);
    expect(classificarNotebook('fx608jmi', 'ASUS TUF F16 · RTX 5060').tgpWatts).toBe(115);
  });

  it('penaliza 8 GB RAM sem excluir o produto', () => {
    const p16 = potencia4k({ gpu: 'RTX 5050', cpu: 'Core i5', ramGb: 16, tgpWatts: 115 });
    const p8 = potencia4k({ gpu: 'RTX 5050', cpu: 'Core i5', ramGb: 8, tgpWatts: 115 });
    expect(p8).toBeLessThan(p16);
    // Multiplicador 0.7 na base; bônus +15 é aditivo → razão final ~0.73
    expect(p8 / p16).toBeLessThan(0.8);

    const cb8 = calcularScore({
      gpu: 'RTX 5050',
      cpu: 'Core i5',
      ramGb: 8,
      tgpWatts: 115,
      preco: 7000,
    });
    expect(cb8?.upgradeRamObrigatorio).toBe(true);
    expect(cb8?.custoUpgradeRamBrl).toBe(200);
    expect(cb8?.estabilidade4k).toBe(true);
  });

  it('dá +15 pts de estabilidade só para TGP >= 110W', () => {
    const full = potencia4k({ gpu: 'RTX 5060', ramGb: 16, tgpWatts: 115 });
    const capado = potencia4k({ gpu: 'RTX 5060', ramGb: 16, tgpWatts: 95 });
    expect(full - BONUS_ESTABILIDADE_4K).toBeGreaterThan(capado);
    expect(full).toBeGreaterThan(capado + BONUS_ESTABILIDADE_4K);
  });

  it('TUF F16 115W vence Nitro V16 95W no custo-benefício mesmo sendo mais caro', () => {
    const tuf = calcularScore({
      gpu: 'RTX 5060',
      cpu: 'Core i5-14450HX',
      ramGb: 16,
      tgpWatts: 115,
      preco: 8499,
    });
    const nitro = calcularScore({
      gpu: 'RTX 5060',
      cpu: 'Ryzen 7',
      ramGb: 16,
      tgpWatts: 95,
      preco: 5989,
    });
    expect(tuf).not.toBeNull();
    expect(nitro).not.toBeNull();
    expect(tuf!.aprovado4kTgp).toBe(true);
    expect(nitro!.aprovado4kTgp).toBe(false);
    expect(tuf!.potenciaPorMil).toBeGreaterThan(nitro!.potenciaPorMil);
  });

  it('marca TGP < 110W como não aprovado para 4K', () => {
    const cb = custoBeneficio4k({
      gpu: 'RTX 5060',
      ramGb: 16,
      tgpWatts: 95,
      preco: 5989,
    });
    expect(cb?.aprovado4kTgp).toBe(false);
    expect(cb?.estabilidade4k).toBe(false);
    expect(cb?.bonusEstabilidade).toBe(0);
  });

  it('calcula os 4 destaques para TV 4K a partir dos produtos do mercado', () => {
    const produtos = [
      {
        produtoChave: 'fx608jhi',
        label: 'ASUS TUF Gaming F16 · Core i5 · 16 GB · RTX 5050',
        menorPreco: 7649,
        lojaMenorPreco: 'Qual Notebook Comprar',
        urlMenorPreco: 'https://quenotebookcomprar.com.br/fx608jhi',
      },
      {
        produtoChave: 'fx608jhr',
        label: 'ASUS TUF Gaming F16 · Core i7-14650HX · 8 GB · RTX 5050',
        menorPreco: 8599,
        lojaMenorPreco: 'Qual Notebook Comprar',
        urlMenorPreco: 'https://quenotebookcomprar.com.br/fx608jhr',
      },
      {
        produtoChave: 'fx608jmi',
        label: 'ASUS TUF Gaming F16 · Core i5-14450HX · 16 GB · RTX 5060',
        menorPreco: 8499,
        lojaMenorPreco: 'Qual Notebook Comprar',
        urlMenorPreco: 'https://quenotebookcomprar.com.br/fx608jmi',
      },
      {
        produtoChave: 'anv16_rtx5060',
        label: 'Acer Nitro V16 · Ryzen 7 · 16 GB · RTX 5060',
        menorPreco: 5989,
        lojaMenorPreco: 'Amazon',
        urlMenorPreco: 'https://example.com/nitro',
      },
    ];

    const destaques = calcularDestaques4k(produtos);
    expect(destaques).not.toBeNull();
    if (!destaques) return;

    // Campeão: TUF F16 5060 Full Power — não o Nitro barato capado
    expect(destaques.campeao?.produtoChave).toBe('fx608jmi');
    expect(destaques.campeao?.preco).toBe(8499);
    expect(destaques.campeao?.tgpWatts).toBe(115);

    expect(destaques.menorEntrada?.produtoChave).toBe('anv16_rtx5060');
    expect(destaques.maxPotencia?.produtoChave).toBe('fx608jmi');

    expect(destaques.alerta8gb).not.toBeNull();
    expect(destaques.alerta8gb?.ramGb).toBe(8);

    expect(destaques.alertaTgp?.tgpWatts).toBeLessThan(110);
    expect(destaques.hdmiInfo.versao).toBe('HDMI 2.1 FRL');
  });
});
