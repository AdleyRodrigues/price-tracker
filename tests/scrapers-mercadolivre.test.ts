import { describe, expect, it } from 'vitest';
import { parsearBuscaMercadoLivre } from '../src/scrapers/mercadolivre';

describe('Mercado Livre Scraper para Notebooks', () => {
  it('extrai produtos compatíveis a partir de cards HTML do Mercado Livre', () => {
    const html = `
      <div class="ui-search-results">
        <div class="poly-card">
          <h2 class="poly-component__title">
            <a href="https://www.mercadolivre.com.br/notebook-asus-tuf-gaming-f16-rtx-5060-16gb-512gb/p/MLB12345">
              Notebook ASUS TUF Gaming F16 Intel Core i5 RTX 5060 16GB 512GB SSD 16"
            </a>
          </h2>
          <div class="poly-price__current">
            <span class="andes-money-amount__fraction">7.899</span>
            <span class="andes-money-amount__cents">00</span>
          </div>
          <div class="poly-price__installments">
            10x de R$ 789,90 sem juros
          </div>
        </div>
        <div class="poly-card">
          <h2 class="poly-component__title">
            <a href="https://www.mercadolivre.com.br/desktop-gamer/p/MLB999">
              Desktop Gamer ASUS TUF RTX 4060
            </a>
          </h2>
          <div class="poly-price__current">
            <span class="andes-money-amount__fraction">5.000</span>
          </div>
        </div>
      </div>
    `;

    const ofertas = parsearBuscaMercadoLivre(html);
    expect(ofertas).toHaveLength(1);
    expect(ofertas[0].loja).toBe('Mercado Livre');
    expect(ofertas[0].titulo).toContain('ASUS TUF Gaming F16');
    expect(ofertas[0].precoAVista).toBe(7899);
    expect(ofertas[0].detalhesParcelamento).toContain('10x de R$ 789,90');
    expect(ofertas[0].url).toContain('MLB12345');
  });
});
