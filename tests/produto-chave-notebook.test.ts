import { describe, expect, it } from 'vitest';
import {
  ehAsinAmazon,
  extrairPartNumberAsus,
  identificarProdutoChaveNotebook,
  labelProdutoNotebook,
} from '../src/domain/filtros';

describe('produto chave notebook', () => {
  it('extrai part number ASUS do título (FX608JHI / FX608JHR)', () => {
    expect(
      extrairPartNumberAsus(
        'Notebook ASUS TUF Gaming F16 FX608JHI RTX 5050 i5 16GB 512GB 16" 16:10'
      )
    ).toBe('fx608jhi');

    expect(
      extrairPartNumberAsus(
        'Notebook ASUS TUF Gaming F16, Intel Core i5 RTX 5050 — FX608JHR-RV124'
      )
    ).toBe('fx608jhr');
  });

  it('usa part number do campo sku quando não for ASIN', () => {
    expect(
      identificarProdutoChaveNotebook('Notebook ASUS TUF F16 RTX 5050 16:10', 'FX608JHI')
    ).toBe('fx608jhi');
  });

  it('ignora ASIN Amazon como modelo', () => {
    expect(ehAsinAmazon('B0D1234567')).toBe(true);
    expect(
      identificarProdutoChaveNotebook(
        'Notebook ASUS TUF Gaming F16 FX608JHR RTX 5050 16"',
        'B0D1234567'
      )
    ).toBe('fx608jhr');
  });

  it('infere FX608JHI/JHR/JMI quando o título F16 omite o part number', () => {
    expect(
      identificarProdutoChaveNotebook(
        'Notebook ASUS TUF Gaming F16, Intel Core i5, NVIDIA GeForce RTX 5050, 16GB, 512GB, KeepOS'
      )
    ).toBe('fx608jhi');

    expect(
      identificarProdutoChaveNotebook(
        'Notebook ASUS TUF Gaming F16 Intel Core i5 RTX 5050 8 GB 512 GB SSD KeepOS'
      )
    ).toBe('fx608jhr');

    expect(
      identificarProdutoChaveNotebook(
        'Notebook ASUS TUF Gaming F16, Intel Core i5 14450HX, NVIDIA RTX 5060, 16GB, 512GB SSD'
      )
    ).toBe('fx608jmi');
  });

  it('infere FX608JHI pelo sufixo TU293W', () => {
    expect(
      identificarProdutoChaveNotebook(
        'Notebook Asus Tuf Gamer F16 Tu293w Rtx 5050 Core i7 16gb Ram'
      )
    ).toBe('fx608jhi');
  });

  it('identifica ASUS Gaming V16 e ignora G16 / M16 (fora do escopo)', () => {
    expect(
      identificarProdutoChaveNotebook(
        'Notebook ASUS Gaming V16, Intel Core 5, NVIDIA RTX 5050, 8GB, 512GB SSD'
      )
    ).toBe('asus_v3607_rtx5060');
    expect(
      identificarProdutoChaveNotebook(
        'Notebook Asus Gamer V16 Rp213 RTX 5050 Core 5 8GB Ram'
      )
    ).toBe('asus_v3607_rtx5060');
    expect(
      identificarProdutoChaveNotebook(
        'Notebook ASUS ROG Strix G16 RTX 5060 Core Ultra 9 32GB RAM'
      )
    ).toBeNull();
    expect(
      identificarProdutoChaveNotebook(
        'Notebook ASUS TUF Gaming G16 RTX 5060 16GB'
      )
    ).toBeNull();
    expect(
      identificarProdutoChaveNotebook(
        'Notebook Gamer Asus Rog Strix G16, Core Ultra 9, Nvidia Rtx™ 5060, 32 Gb Ram, 1.0 Tb'
      )
    ).toBeNull();
  });

  it('aceita TUF A16 / FA607', () => {
    expect(
      identificarProdutoChaveNotebook(
        'ASUS TUF A16 FA607NV RTX 4060 Ryzen 7 16 polegadas WUXGA 16:10'
      )
    ).toBe('fa607nv');
  });

  it('identifica e normaliza novas marcas: Avell, Lenovo LOQ, Acer Nitro V16 e ASUS V16', () => {
    // Avell Storm 560 & ION A70
    expect(
      identificarProdutoChaveNotebook(
        'Notebook Gamer Avell Storm 560 Intel Core i7-14700HX RTX 5060 16GB 1TB SSD 16"'
      )
    ).toBe('avell_storm560_rtx5060');
    expect(
      identificarProdutoChaveNotebook(
        'Notebook Avell ION A70 AMD Ryzen 7-8845HS RTX 5060 16GB 16" WUXGA'
      )
    ).toBe('avell_iona70_rtx5060');

    // Lenovo LOQ
    expect(
      identificarProdutoChaveNotebook(
        'Notebook Gamer Lenovo LOQ 15IRX9 Intel Core i5 RTX 5060 16GB'
      )
    ).toBe('loq_15irx9');
    expect(
      identificarProdutoChaveNotebook(
        'Notebook Gamer Lenovo LOQ 15 Intel Core i5 RTX 5060 16GB 512GB'
      )
    ).toBe('loq_15_rtx5060');

    // Acer Nitro V16
    expect(
      identificarProdutoChaveNotebook(
        'Notebook Gamer Acer Nitro V16 ANV16-41 AMD Ryzen 7 RTX 5060 16GB 16"'
      )
    ).toBe('anv16_41');
    expect(
      identificarProdutoChaveNotebook(
        'Notebook Gamer Acer Nitro V16 Ryzen 7 RTX 5060 16GB SSD 512GB'
      )
    ).toBe('anv16_rtx5060');

    // ASUS Gaming V16
    expect(
      identificarProdutoChaveNotebook(
        'Notebook ASUS Gaming V16 V3607VH RTX 5060 Intel Core 5 16GB 512GB SSD'
      )
    ).toBe('asus_v3607_rtx5060');
  });

  it('gera labels informativos para as novas famílias com hint de título', () => {
    expect(
      labelProdutoNotebook(
        'avell_storm560_rtx5060',
        'Notebook Gamer Avell Storm 560 Intel Core i7-14700HX 16GB RAM RTX 5060 16"'
      )
    ).toBe('Avell Storm 560 · Core i7-14700HX · 16 GB · RTX 5060');

    expect(
      labelProdutoNotebook(
        'loq_15_rtx5060',
        'Notebook Gamer Lenovo LOQ 15 Intel Core i5 16GB RAM RTX 5060 15.6"'
      )
    ).toBe('Lenovo LOQ · Core i5 · 16 GB · RTX 5060');

    expect(
      labelProdutoNotebook(
        'anv16_41',
        'Notebook Gamer Acer Nitro V16 ANV16-41 AMD Ryzen 7 16GB RAM RTX 5060'
      )
    ).toBe('Acer Nitro V16 · Ryzen 7 · 16 GB · RTX 5060');
  });

  it('retorna null quando não há série nem GPU mapeável', () => {
    expect(identificarProdutoChaveNotebook('Produto genérico sem specs')).toBeNull();
  });

  it('monta label com nome comercial (não part number), CPU, RAM e GPU', () => {
    expect(
      labelProdutoNotebook(
        'fx608jhi',
        'Notebook ASUS TUF Gaming F16 FX608JHI Intel Core i5-14450HX 16GB RAM RTX 5050 16:10'
      )
    ).toBe('ASUS TUF Gaming F16 · Core i5-14450HX · 16 GB · RTX 5050');

    expect(
      labelProdutoNotebook(
        'fx608jmi',
        'Notebook ASUS TUF Gaming F16 FX608JMI Intel Core i5-14450HX 16GB RAM RTX 5060'
      )
    ).toBe('ASUS TUF Gaming F16 · Core i5-14450HX · 16 GB · RTX 5060');

    // Sem título: nome da série + RAM da ficha (nunca part number)
    expect(labelProdutoNotebook('fx608jhr')).toBe('ASUS TUF Gaming F16 · 8 GB (ficha técnica)');
  });
});
