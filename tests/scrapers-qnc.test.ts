import { describe, expect, it } from 'vitest';
import { parsearBuscaQNC } from '../src/scrapers/qnc';

describe('Qual Notebook Comprar Scraper', () => {
  it('extrai ofertas válidas com especificações e preço em formato pt-BR milhar', () => {
    const html = `
      <div class="posts-wrapper">
        <article class="post">
          <div class="post-summary">
            <h3 class="post-title">
              <a href="https://quenotebookcomprar.com.br/asus-tuf-gaming-f16-fx608jhr-rv124/">
                ASUS TUF Gaming F16 FX608JHR-RV124
                <ul class="specs_short_list">
                  <li class="availability in-stock">R$ 7.899</li>
                  <li>Core i5-14450HX</li>
                  <li>GeForce RTX 5050</li>
                  <li>Linux</li>
                  <li>RAM 8 GB</li>
                  <li>SSD 512 GB</li>
                  <li>Tela LED 16,0″ pol.</li>
                  <li>WUXGA IPS-level 165 Hz</li>
                  <li>Teclado iluminado</li>
                  <li>Garantia 1 ano</li>
                </ul>
              </a>
            </h3>
          </div>
        </article>
        <article class="post">
          <div class="post-summary">
            <h3 class="post-title">
              <a href="https://quenotebookcomprar.com.br/asus-tuf-gaming-a15/">
                ASUS TUF Gaming A15
                <ul class="specs_short_list">
                  <li class="availability in-stock">R$ 5.000</li>
                  <li>GeForce RTX 3050</li>
                  <li>Tela 15.6 pol.</li>
                </ul>
              </a>
            </h3>
          </div>
        </article>
      </div>
    `;

    const ofertas = parsearBuscaQNC(html);
    expect(ofertas).toHaveLength(1);
    expect(ofertas[0].loja).toBe('Qual Notebook Comprar');
    expect(ofertas[0].titulo).toContain('ASUS TUF Gaming F16');
    expect(ofertas[0].precoAVista).toBe(7899);
    expect(ofertas[0].url).toBe('https://quenotebookcomprar.com.br/asus-tuf-gaming-f16-fx608jhr-rv124/');
  });

  it('ignora ofertas sem estoque', () => {
    const html = `
      <article class="post">
        <h3 class="post-title">
          <a href="https://quenotebookcomprar.com.br/asus-tuf-gaming-f16/">
            ASUS TUF Gaming F16
            <ul class="specs_short_list">
              <li class="availability out-of-stock">Sem estoque</li>
              <li>GeForce RTX 5060</li>
              <li>Tela 16,0″ pol.</li>
            </ul>
          </a>
        </h3>
      </article>
    `;

    const ofertas = parsearBuscaQNC(html);
    expect(ofertas).toHaveLength(0);
  });
});
