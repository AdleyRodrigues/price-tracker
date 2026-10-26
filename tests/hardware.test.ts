import { describe, expect, it } from 'vitest';
import {
  extrairHardware,
  extrairHardwareCelular,
  formatarBadgeHardware,
  formatarBadgeHardwareCelular,
} from '../src/domain/hardware';

describe('hardware domain', () => {
  describe('notebooks', () => {
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

  describe('celulares', () => {
    it('extrai especificações de Xiaomi 17T Pro (RAM, ROM, Câmera, Versão)', () => {
      const titulo = 'Celular Xiaomi 17t Pro De 512gb 12gb Ram De 6.83" 50+50+12mp 32mp - Negro (global)';
      const hw = extrairHardwareCelular(titulo);
      expect(hw).not.toBeNull();
      expect(hw?.modelo).toBe('Xiaomi 17T Pro');
      expect(hw?.storage).toBe('512GB');
      expect(hw?.ram).toBe('12 GB RAM');
      expect(hw?.camera).toBe('50+50+12MP');
      expect(hw?.versao).toBe('Global');

      const badge = formatarBadgeHardwareCelular(titulo);
      expect(badge).toContain('📱 **Modelo:** `Xiaomi 17T Pro`');
      expect(badge).toContain('💾 **ROM:** `512GB`');
      expect(badge).toContain('⚡ **RAM:** `12 GB RAM`');
      expect(badge).toContain('🌐 `Global`');
    });

    it('extrai especificações de Xiaomi 15T Pro com Câmera Leica e 5G', () => {
      const titulo = 'Smartphone Xiaomi 15t Pro 5g 12gb Ram 512gb Câmera Leica 5x - Dourado';
      const hw = extrairHardwareCelular(titulo);
      expect(hw).not.toBeNull();
      expect(hw?.modelo).toBe('Xiaomi 15T Pro');
      expect(hw?.storage).toBe('512GB');
      expect(hw?.ram).toBe('12 GB RAM');
      expect(hw?.camera).toContain('Leica');
      expect(hw?.versao).toContain('5G');

      const badge = formatarBadgeHardwareCelular(titulo);
      expect(badge).toContain('📱 **Modelo:** `Xiaomi 15T Pro`');
      expect(badge).toContain('📷 `Leica`');
    });

    it('extrai especificações de POCO X8 Pro Max com bateria e 5G Global', () => {
      const titulo = 'Xiaomi Poco X8 Pro Max 512gb 12+12gb Ram 8.500mah 5g Global Preto';
      const hw = extrairHardwareCelular(titulo);
      expect(hw).not.toBeNull();
      expect(hw?.modelo).toBe('POCO X8 Pro Max');
      expect(hw?.storage).toBe('512GB');
      expect(hw?.ram).toBe('12+12 GB RAM');
      expect(hw?.bateria).toBe('8.500mAh');
      expect(hw?.versao).toContain('Global 5G');

      const badge = formatarBadgeHardwareCelular(titulo);
      expect(badge).toContain('📱 **Modelo:** `POCO X8 Pro Max`');
      expect(badge).toContain('🔋 `8.500mAh`');
    });
  });
});
