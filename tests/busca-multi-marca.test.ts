import { describe, expect, it } from 'vitest';
import {
  MARCAS_COM_SERIE,
  gerarUrlsKabum,
  gerarUrlsMagalu,
  gerarUrlsMercadoLivre,
  slugBusca,
  urlKabumBusca,
  urlMagaluBusca,
  urlMercadoLivre,
} from '../src/config/busca-multi-marca';
import { AMAZON_BUSCA_URLS, KABUM_BUSCA_URLS, MAGALU_BUSCA_URLS, MERCADO_LIVRE_BUSCA_URLS } from '../src/config/regras';
import {
  ehSerieForaEscopo,
  identificarProdutoChaveNotebook,
  tituloBloqueado,
} from '../src/domain/filtros';

describe('busca multi-marca', () => {
  it('gera slug com hífens', () => {
    expect(slugBusca('Avell Storm 560 RTX 5060')).toBe('avell-storm-560-rtx-5060');
  });

  it('URL Mercado Livre lista por marca', () => {
    expect(urlMercadoLivre('avell storm 560')).toBe(
      'https://lista.mercadolivre.com.br/notebook-avell-storm-560'
    );
    expect(urlMercadoLivre('avell storm560')).toBe(
      'https://lista.mercadolivre.com.br/notebook-avell-storm560'
    );
    expect(urlMercadoLivre('acer nitro v16 rtx 5060')).toContain(
      'notebook-acer-nitro-v16-rtx-5060'
    );
    expect(urlMercadoLivre('dell g16 rtx 4060')).toContain('notebook-dell-g16-rtx-4060');
    expect(urlMercadoLivre('gigabyte aorus 16 rtx 4060')).toContain(
      'notebook-gigabyte-aorus-16-rtx-4060'
    );
  });

  it('URL KaBuM busca por marca', () => {
    expect(urlKabumBusca('avell storm 560')).toBe(
      'https://www.kabum.com.br/busca/notebook-avell-storm-560'
    );
    expect(urlKabumBusca('avell ion a70')).toBe(
      'https://www.kabum.com.br/busca/notebook-avell-ion-a70'
    );
    expect(urlKabumBusca('alienware m16 rtx 4060')).toContain(
      'notebook-alienware-m16-rtx-4060'
    );
  });

  it('URL Magalu e Amazon multi-marca ativas', () => {
    expect(urlMagaluBusca('asus tuf rtx 4060')).toBe(
      'https://www.magazineluiza.com.br/busca/notebook+asus+tuf+rtx+4060/'
    );
    expect(gerarUrlsMagalu(['ASUS']).length).toBeGreaterThan(0);
    expect(MAGALU_BUSCA_URLS.some((u) => /asus|acer|avell/i.test(u))).toBe(true);
    expect(AMAZON_BUSCA_URLS.some((u) => /dell|gigabyte|acer/i.test(u))).toBe(true);
    expect(AMAZON_BUSCA_URLS.length).toBeGreaterThan(8);
  });

  it('expõe Acer, Avell, Dell e Gigabyte — sem Lenovo', () => {
    expect(MERCADO_LIVRE_BUSCA_URLS.some((u) => /acer|nitro|anv16/i.test(u))).toBe(true);
    expect(MERCADO_LIVRE_BUSCA_URLS.some((u) => /avell/i.test(u))).toBe(true);
    expect(MERCADO_LIVRE_BUSCA_URLS.some((u) => /dell/i.test(u))).toBe(true);
    expect(MERCADO_LIVRE_BUSCA_URLS.some((u) => /gigabyte|aorus/i.test(u))).toBe(true);
    expect(MERCADO_LIVRE_BUSCA_URLS.some((u) => /lenovo|loq/i.test(u))).toBe(false);
    expect(KABUM_BUSCA_URLS.some((u) => /acer|nitro|anv16/i.test(u))).toBe(true);
    expect(KABUM_BUSCA_URLS.some((u) => /avell/i.test(u))).toBe(true);
    expect(KABUM_BUSCA_URLS.some((u) => /lenovo|loq/i.test(u))).toBe(false);
    expect(MARCAS_COM_SERIE).toContain('Acer');
    expect(MARCAS_COM_SERIE).toContain('Dell');
    expect(MARCAS_COM_SERIE).not.toContain('Lenovo');
    expect(gerarUrlsMercadoLivre().length).toBeGreaterThan(12);
    expect(gerarUrlsKabum().length).toBeGreaterThan(12);
  });
});

describe('escopo Dell G16 vs ASUS G16', () => {
  const dellG16 =
    'Notebook Dell G16 7630 Intel Core i7 RTX 4060 16GB 1TB SSD 16" QHD 16:10';
  const alienwareM16 =
    'Notebook Alienware m16 R2 Intel Core Ultra 9 RTX 4060 32GB 16" WQXGA';
  const asusStrixG16 =
    'Notebook ASUS ROG Strix G16 G615JM RTX 5060 16GB 16"';
  const asusTufG16 = 'Notebook ASUS TUF Gaming G16 RTX 5050 16:10';
  const asusZephyrus =
    'Laptop Gamer ASUS Zephyrus G16 RTX 4070 16" WQXGA';

  it('libera Dell G16 e Alienware m16 (coleta premium)', () => {
    expect(ehSerieForaEscopo(dellG16)).toBe(false);
    expect(ehSerieForaEscopo(alienwareM16)).toBe(false);
    expect(tituloBloqueado(dellG16)).toBe(false);
    expect(tituloBloqueado(alienwareM16)).toBe(false);
    expect(identificarProdutoChaveNotebook(dellG16)).toBe('dell_g16_rtx4060');
    expect(identificarProdutoChaveNotebook(alienwareM16)).toBe('alienware_m16_rtx4060');
  });

  it('bloqueia ASUS G16 / Strix / Zephyrus / TUF G16', () => {
    expect(ehSerieForaEscopo(asusStrixG16)).toBe(true);
    expect(ehSerieForaEscopo(asusTufG16)).toBe(true);
    expect(ehSerieForaEscopo(asusZephyrus)).toBe(true);
    expect(tituloBloqueado(asusStrixG16)).toBe(true);
    expect(tituloBloqueado(asusTufG16)).toBe(true);
    expect(identificarProdutoChaveNotebook(asusStrixG16)).toBeNull();
    expect(identificarProdutoChaveNotebook(asusTufG16)).toBeNull();
  });

  it('libera Gigabyte AORUS 16 com RTX 4060', () => {
    const aorus =
      'Notebook Gigabyte AORUS 16 Intel Core i7 RTX 4060 16GB 16" WQXGA 16:10';
    expect(ehSerieForaEscopo(aorus)).toBe(false);
    expect(tituloBloqueado(aorus)).toBe(false);
    expect(identificarProdutoChaveNotebook(aorus)).toBe('gigabyte_aorus16_rtx4060');
  });

  it('chave ASUS-style g16_* continua bloqueada; dell_g16_* passa', () => {
    expect(ehSerieForaEscopo('rtx 4060', 'g16_rtx4060_16gb')).toBe(true);
    expect(ehSerieForaEscopo(dellG16, 'dell_g16_rtx4060')).toBe(false);
  });
});
