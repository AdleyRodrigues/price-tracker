import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';
import { ItemCatalogo } from '../src/config/catalogo';
import {
  freteFallbackAmazon,
  parsearAmazon,
  parsearBuscaAmazon,
  primeiroTexto,
  vendedorAmazon,
} from '../src/scrapers/amazon';

describe('amazon scraper', () => {
  const itemExemplo: ItemCatalogo = {
    loja: 'Amazon',
    produto: 'Notebook Gamer ASUS TUF A16 RTX 4060',
    sku: 'B0ASUSTUF1',
    url: 'https://www.amazon.com.br/dp/B0ASUSTUF1',
    parser: 'amazon',
    freteFallback: 0,
  };

  describe('vendedorAmazon', () => {
    it('identifica vendedor terceiro a partir de tags do HTML', () => {
      const html = '<div id="merchant-info">Vendido e enviado por Leveros</div>';
      const $ = cheerio.load(html);
      expect(vendedorAmazon($)).toContain('Leveros');
    });
  });

  describe('freteFallbackAmazon', () => {
    it('retorna fallback específico de Leveros (86.98)', () => {
      expect(freteFallbackAmazon(itemExemplo, 'Leveros')).toBe(86.98);
    });

    it('retorna fallback padrão quando não há seller de frete customizado', () => {
      expect(freteFallbackAmazon(itemExemplo, 'Amazon')).toBe(0);
    });
  });

  describe('parsearAmazon', () => {
    it('extrai preço, parcelamento, cupom e frete explícito com sucesso', () => {
      const html = `
        <html>
          <body>
            <div id="corePrice_feature_div">
              <span class="a-offscreen">R$ 5.499,00</span>
            </div>
            <div id="centerCol">
              <span>em até 10x de R$ 549,90 sem juros</span>
            </div>
            <div id="couponBadge">
              <span>Economize R$ 300,00 com cupom</span>
            </div>
            <div id="merchant-info">Vendido por Amazon.com.br</div>
            <div id="deliveryBlockMessage">
              <span>Entrega GRÁTIS</span>
            </div>
          </body>
        </html>
      `;
      const bruta = parsearAmazon(html, itemExemplo);
      expect(bruta.precoAVista).toBe(5499.0);
      expect(bruta.precoParcelado).toBe(5499.0);
      expect(bruta.detalhesParcelamento).toContain('10x de R$');
      expect(bruta.cupomDesconto).toBe(300.0);
      expect(bruta.precoComCupom).toBe(5199.0);
      expect(bruta.frete).toBe(0);
      expect(bruta.loja).toBe('Amazon');
      expect(bruta.fonteId).toBe('amazon');
    });

    it('ignora preços de carrosséis/outras ofertas e extrai o preço real do buybox', () => {
      const html = `
        <html>
          <body>
            <div id="p13n-desktop-sims-fbt">
              <span class="a-price"><span class="a-offscreen">R$ 6.139,00</span></span>
            </div>
            <div id="aod-ingress-link">
              <span class="a-price"><span class="a-offscreen">R$ 6.139,00</span></span>
            </div>
            <div id="centerCol">
              <div id="corePrice_feature_div">
                <span class="a-price aok-align-center apex-pricetopay-value">
                  <span class="a-offscreen">R$ 5.200,00</span>
                </span>
              </div>
            </div>
            <div id="sellerProfileTriggerId">Amazon</div>
            <div id="deliveryBlockMessage">
              <span>Entrega GRÁTIS</span>
            </div>
          </body>
        </html>
      `;
      const bruta = parsearAmazon(html, itemExemplo);
      expect(bruta.precoAVista).toBe(5200.0);
      expect(bruta.frete).toBe(0);
    });

    it('calcula desconto Pix quando apenas o total parcelado está no seletor e o buybox indica 10% off', () => {
      const html = `
        <html>
          <body>
            <div id="centerCol">
              <div id="corePrice_feature_div">
                <span class="a-offscreen">R$ 6.000,00</span>
              </div>
              <div id="apex_desktop">
                <span>10% off à vista no Pix ou NuPay</span>
                <span>ou em até 12x de R$ 500,00 sem juros (total parcelado R$ 6.000,00)</span>
              </div>
            </div>
            <div id="merchant-info">Vendido por Amazon.com.br</div>
          </body>
        </html>
      `;
      const bruta = parsearAmazon(html, itemExemplo);
      expect(bruta.precoAVista).toBe(5400.0);
    });

    it('lança erro quando detecta captcha da Amazon', () => {
      const html = '<html><body><h4>sorry, we just need to make sure you\'re not a robot</h4></body></html>';
      expect(() => parsearAmazon(html, itemExemplo)).toThrow(/Captcha/);
    });

    it('lança erro quando não encontra seletor de preço', () => {
      const html = '<html><body><div>Produto Indisponível</div></body></html>';
      expect(() => parsearAmazon(html, itemExemplo)).toThrow(/seletor de preço não encontrado/);
    });
  });

  describe('parsearBuscaAmazon', () => {
    it('extrai múltiplos resultados válidos de ASUS 16:10 da página de busca', () => {
      const html = `
        <html>
          <body>
            <div data-component-type="s-search-result" data-asin="B0ASUSTUF1">
              <h2>
                <a href="/dp/B0ASUSTUF1">
                  <span>Notebook Gamer ASUS TUF Gaming A16 RTX 4060 16GB RAM</span>
                </a>
              </h2>
              <div class="a-price">
                <span class="a-offscreen">R$ 5.299,00</span>
              </div>
              <span>em até 10x de R$ 529,90 sem juros</span>
              <span aria-label="Entrega GRÁTIS">Entrega GRÁTIS</span>
            </div>
            <div data-component-type="s-search-result" data-asin="B0DESKTOP1">
              <h2>
                <a href="/dp/B0DESKTOP1">
                  <span>Desktop Gamer ASUS TUF Intel i7 RTX 4060</span>
                </a>
              </h2>
              <div class="a-price">
                <span class="a-offscreen">R$ 4.999,00</span>
              </div>
            </div>
          </body>
        </html>
      `;
      const itemBusca: ItemCatalogo = {
        loja: 'Amazon (Busca ASUS RTX 4060)',
        produto: 'Notebook ASUS RTX 4060 (16:10)',
        url: 'https://www.amazon.com.br/s?k=notebook+asus+rtx+4060',
        parser: 'amazon',
      };
      const ofertas = parsearBuscaAmazon(html, itemBusca);
      expect(ofertas).toHaveLength(1);
      expect(ofertas[0].titulo).toContain('ASUS TUF Gaming A16 RTX 4060');
      expect(ofertas[0].precoAVista).toBe(5299.0);
      expect(ofertas[0].precoParcelado).toBe(5299.0);
      expect(ofertas[0].detalhesParcelamento).toContain('10x de R$');
      expect(ofertas[0].url).toBe('https://www.amazon.com.br/dp/B0ASUSTUF1');
      expect(ofertas[0].frete).toBe(0);
    });
  });
});
