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

  it('ignora ASUS V16 (fora do escopo)', () => {
    expect(
      identificarProdutoChaveNotebook(
        'Notebook ASUS Gaming V16, Intel Core 5, NVIDIA RTX 5050, 8GB, 512GB SSD'
      )
    ).toBeNull();
    expect(
      identificarProdutoChaveNotebook(
        'Notebook Asus Gamer V16 Rp213 RTX 5050 Core 5 8GB Ram'
      )
    ).toBeNull();
  });

  it('retorna null quando não há série nem GPU mapeável', () => {
    expect(identificarProdutoChaveNotebook('Produto genérico sem specs')).toBeNull();
  });

  it('monta label com CPU, RAM e GPU quando há hint de título', () => {
    expect(
      labelProdutoNotebook(
        'fx608jhi',
        'Notebook ASUS TUF Gaming F16 FX608JHI Intel Core i5-14450HX 16GB RAM RTX 5050 16:10'
      )
    ).toBe('FX608JHI · Core i5-14450HX · 16 GB · RTX 5050');

    expect(labelProdutoNotebook('fx608jhr')).toBe('FX608JHR');
  });
});
