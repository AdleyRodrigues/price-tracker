import { describe, expect, it } from 'vitest';
import { parsearBuscaAsus } from '../src/scrapers/asus';

describe('ASUS Store Search Scraper', () => {
  it('extrai ofertas válidas da página de busca da ASUS Store com preço à vista e parcelado', () => {
    const html = `
      <ol class="products list items product-items">
        <li class="item product product-item">
          <div class="product-item-info">
            <strong class="product name product-item-name">
              <a class="product-item-link" href="https://br.store.asus.com/notebook-asus-tuf-gaming-f16-fx608jhi-tu292-jaeger-gray.html">
                Notebook ASUS TUF Gaming F16, Intel Core i5, NVIDIA GeForce RTX™ 5050, 16GB, 512GB, KeepOS, 16" LCD LED FHD, Jaeger Gray
              </a>
            </strong>
            <div class="product details product-item-details">
              <div class="price-box price-final_price">
                <span class="price-container price-final_price">
                  <span data-price-amount="7999" data-price-type="finalPrice" class="price-wrapper">
                    <span class="price">R$&nbsp;7.999,00</span>
                  </span>
                </span>
              </div>
              <span class="price-management-container">
                <span class="price-management price-management-installments">
                  Ou <strong>18x de</strong> <span class="price">R$&nbsp;444,38</span>
                  <span class="label-installment">| Total de</span>
                  <span class="total-installment"><span class="price">R$&nbsp;7.999,00</span></span>
                </span>
                <span class="price-management price-management-onetime">
                  <span class="price">R$&nbsp;7.199,10</span> À vista
                </span>
              </span>
            </div>
          </div>
        </li>
        <li class="item product product-item">
          <div class="product-item-info">
            <strong class="product name product-item-name">
              <a class="product-item-link" href="https://br.store.asus.com/notebook-asus-tuf-gaming-a15.html">
                Notebook ASUS TUF Gaming A15, AMD Ryzen 7, GeForce RTX™ 3050, 15.6"
              </a>
            </strong>
            <div class="price-box">
              <span class="price">R$&nbsp;4.999,00</span>
            </div>
          </div>
        </li>
      </ol>
    `;

    const ofertas = parsearBuscaAsus(html);
    expect(ofertas).toHaveLength(1);
    expect(ofertas[0].loja).toBe('Loja Oficial ASUS');
    expect(ofertas[0].titulo).toContain('ASUS TUF Gaming F16');
    expect(ofertas[0].precoAVista).toBe(7199.10);
    expect(ofertas[0].precoParcelado).toBe(7999.00);
    expect(ofertas[0].detalhesParcelamento).toContain('18x de R$ 444,38');
    expect(ofertas[0].url).toBe('https://br.store.asus.com/notebook-asus-tuf-gaming-f16-fx608jhi-tu292-jaeger-gray.html');
  });

  it('retorna array vazio quando nenhum produto cumpre os critérios', () => {
    const html = `
      <div class="products list items product-items">
        <div class="item product product-item">
          <a class="product-item-link" href="https://br.store.asus.com/desktop-gamer.html">
            Desktop ASUS ROG Gamer RTX 4060
          </a>
          <span class="price">R$&nbsp;8.000,00</span>
        </div>
      </div>
    `;
    const ofertas = parsearBuscaAsus(html);
    expect(ofertas).toHaveLength(0);
  });
});
