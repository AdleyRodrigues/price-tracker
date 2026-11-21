import { describe, expect, it } from 'vitest';
import {
  obterPerfilChassi,
  tetoTgpGpu,
  tgpEfetivo,
} from '../src/domain/hardware-perfis';

describe('hardware-perfis domain', () => {
  it('aplica teto 115W em TUF F16 + RTX 5060 (não 140W)', () => {
    const perfil = obterPerfilChassi('ASUS TUF Gaming F16 FX608JMI RTX 5060');
    expect(perfil.marca).toBe('ASUS');
    expect(perfil.linha).toBe('TUF Gaming F16');
    expect(perfil.tgpWatts).toBe(115);
    expect(perfil.categoriaTgp).toBe('full_power');
    expect(perfil.suporta4k120Hz).toBe(true);
    expect(perfil.slotsRamSodimm).toBe(2);
  });

  it('aplica teto 115W em TUF A16 + RTX 5050', () => {
    const perfil = obterPerfilChassi('ASUS TUF Gaming A16 FA608 RTX 5050');
    expect(perfil.tgpWatts).toBe(115);
    expect(tetoTgpGpu('RTX 5050')).toBe(115);
    expect(tgpEfetivo(140, 'RTX 5060')).toBe(115);
  });

  it('aplica teto 115W em TUF A16 + RTX 4060', () => {
    const perfil = obterPerfilChassi('ASUS TUF Gaming A16 FA607NV RTX 4060 Ryzen 7');
    expect(perfil.tgpWatts).toBe(115);
  });

  it('identifica corretamente o perfil do Avell Storm 560 (Full Power 115W)', () => {
    const perfil = obterPerfilChassi('Notebook Gamer Avell Storm 560 RTX 5060');
    expect(perfil.marca).toBe('Avell');
    expect(perfil.linha).toBe('Storm 560');
    expect(perfil.tgpWatts).toBe(115);
    expect(perfil.categoriaTgp).toBe('full_power');
    expect(perfil.hdmiVersao).toContain('FRL');
    expect(perfil.suporta4k120Hz).toBe(true);
  });

  it('identifica corretamente o perfil do Avell ION A70 (Full Power 115W)', () => {
    const perfil = obterPerfilChassi('Notebook Avell ION A70 AMD Ryzen 7 RTX 5060');
    expect(perfil.marca).toBe('Avell');
    expect(perfil.linha).toBe('ION A70');
    expect(perfil.tgpWatts).toBe(115);
    expect(perfil.categoriaTgp).toBe('full_power');
  });

  it('identifica corretamente o perfil do Lenovo LOQ 15/16 (Full Power 115W)', () => {
    const perfil = obterPerfilChassi('Notebook Gamer Lenovo LOQ 15IRX9 RTX 5060');
    expect(perfil.marca).toBe('Lenovo');
    expect(perfil.tgpWatts).toBe(115);
    expect(perfil.categoriaTgp).toBe('full_power');
    expect(perfil.suporta4k120Hz).toBe(true);
  });

  it('identifica corretamente o perfil do Acer Nitro V16 (Balanceado 95W)', () => {
    const perfil = obterPerfilChassi('Notebook Gamer Acer Nitro V16 ANV16-41 RTX 5060');
    expect(perfil.marca).toBe('Acer');
    expect(perfil.tgpWatts).toBe(95);
    expect(perfil.categoriaTgp).toBe('balanceado');
  });

  it('identifica corretamente o perfil reduzido do ASUS Gaming V16 (Slim 60W TMDS)', () => {
    const perfil = obterPerfilChassi('Notebook ASUS Gaming V16 V3607VH RTX 5060');
    expect(perfil.marca).toBe('ASUS');
    expect(perfil.linha).toContain('V16');
    expect(perfil.tgpWatts).toBe(60);
    expect(perfil.categoriaTgp).toBe('slim_reduzido');
    expect(perfil.suporta4k120Hz).toBe(false);
    expect(perfil.avisoHardware).not.toBeNull();
  });
});
