import { describe, expect, it } from 'vitest';
import { montarTituloAvell, parsearBuscaAvell } from '../src/scrapers/avell';
import { identificarProdutoChaveNotebook } from '../src/domain/filtros';

describe('avell scraper', () => {
  it('monta título com Notebook + GPU a partir do slug/card', () => {
    const titulo = montarTituloAvell(
      '/storm-560-amd-ryzen-7-255-rtx5060',
      "Avell STORM 560RTX 5060 - 8 GB Full Power 115WAmd Ryzen 7 25515.6' FHD 144Hz A partir deR$ 6.999,00 no PIX"
    );
    expect(titulo).toMatch(/Notebook Avell/i);
    expect(titulo).toMatch(/Storm\s*560/i);
    expect(titulo).toMatch(/RTX\s*5060/i);
    expect(titulo).toMatch(/AMD Ryzen 7 255/i);
    expect(identificarProdutoChaveNotebook(titulo)).toBe('avell_storm560_rtx5060');
  });

  it('parseia cards HTML da listagem e aceita Storm 560 / ION A70', () => {
    const html = `
      <a href="/storm-560-amd-ryzen-7-255-rtx5060">
        Avell STORM 560 RTX 5060 Amd Ryzen 7 255 15.6' FHD
        A partir de R$ 6.999,00 no PIX ou 12x de R$ 648,05
      </a>
      <a href="/storm-560-intel-core-i7-14650hx-rtx5060">
        Avell STORM 560 RTX 5060 Intel Core i7 14650HX 16' QHD+
        A partir de R$ 8.798,99 no PIX ou 21x de R$ 572,80
      </a>
      <a href="/ion-a70-black-ultra7-155h-rtx5060">
        Avell ION A70 RTX 5060 Intel Ultra 7 155H 15.3 QHD+
        A partir de R$ 8.999,00 no PIX
      </a>
      <a href="/storm-350-intel-c7-230h-rtx3050">
        Avell STORM 350 RTX 3050 A partir de R$ 5.299,00 no PIX
      </a>
    `;
    const ofertas = parsearBuscaAvell(html);
    expect(ofertas.length).toBe(3);
    expect(ofertas.every((o) => o.loja === 'Loja Oficial Avell')).toBe(true);
    expect(ofertas.some((o) => o.precoAVista === 6999)).toBe(true);
    expect(ofertas.some((o) => /ion\s*a70/i.test(o.titulo))).toBe(true);
    expect(ofertas.every((o) => !/3050/.test(o.titulo))).toBe(true);
  });
});
