import { describe, expect, it } from 'vitest';
import { extrairHardware, formatarBadgeHardware } from '../src/domain/hardware';

describe('hardware domain', () => {
  it('extrai GPU, CPU, RAM e SSD de títulos ASUS Store', () => {
    const titulo = 'Notebook ASUS TUF Gaming F16, Intel Core i5, NVIDIA GeForce RTX™ 5050, 16GB, 512GB, KeepOS, 16" LCD LED FHD, Jaeger Gray';
    const hw = extrairHardware(titulo);
    expect(hw.gpu).toBe('RTX 5050');
    expect(hw.cpu).toBe('Core i5');
    expect(hw.ram).toBe('16 GB RAM');
    expect(hw.ssd).toBe('512GB SSD');

    const badge = formatarBadgeHardware(titulo);
    expect(badge).toContain('🎮 **GPU:** `RTX 5050`');
    expect(badge).toContain('🧠 **CPU:** `Core i5`');
    expect(badge).toContain('⚡ **RAM:** `16 GB RAM`');
  });

  it('extrai processadores com sufixo HX de títulos Qual Notebook Comprar', () => {
    const titulo = 'Notebook ASUS TUF Gaming F16 FX608JHR-RV124 Core i5-14450HX (14ª ger.) GeForce RTX 5050 Linux RAM 8 GB SSD 512 GB Tela LED 16,0″ pol. WUXGA IPS-level 165 Hz';
    const hw = extrairHardware(titulo);
    expect(hw.gpu).toBe('RTX 5050');
    expect(hw.cpu).toBe('Core i5-14450HX');
    expect(hw.ram).toBe('8 GB RAM');
    expect(hw.ssd).toBe('512 GB SSD');

    const badge = formatarBadgeHardware(titulo);
    expect(badge).toContain('🧠 **CPU:** `Core i5-14450HX`');
    expect(badge).toContain('⚡ **RAM:** `8 GB RAM`');
  });

  it('extrai RTX 5060 e Core i7 de títulos da comunidade', () => {
    const titulo = 'Notebook ASUS TUF Gaming F16 RV298 Intel i7 14650HX NVIDIA RTX 5060 16GB RAM 512GB SSD';
    const hw = extrairHardware(titulo);
    expect(hw.gpu).toBe('RTX 5060');
    expect(hw.cpu).toBe('Core i7-14650HX');
    expect(hw.ram).toBe('16 GB RAM');
  });

  it('extrai processadores AMD Ryzen', () => {
    const titulo = 'Notebook ASUS TUF Gaming A16 FA607NV Ryzen 7 7735HS RTX 4060 16GB RAM 512GB SSD';
    const hw = extrairHardware(titulo);
    expect(hw.gpu).toBe('RTX 4060');
    expect(hw.cpu).toBe('Ryzen 7-7735HS');
    expect(hw.ram).toBe('16 GB RAM');
  });

  it('retorna null quando título for vazio', () => {
    const hw = extrairHardware('');
    expect(hw.gpu).toBeNull();
    expect(formatarBadgeHardware('')).toBeNull();
  });
});
