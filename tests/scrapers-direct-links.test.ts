import { describe, expect, it } from 'vitest';
import { ItemCatalogo } from '../src/config/catalogo';
import { parsearKabum } from '../src/scrapers/kabum';
import { parsearAsus } from '../src/scrapers/asus';
import { parsearMagalu } from '../src/scrapers/magalu';
import { parsearShopee } from '../src/scrapers/shopee';

describe('scrapers de links diretos', () => {
  describe('KaBuM! Scraper', () => {
    const item: ItemCatalogo = {
      loja: 'KaBuM!',
      produto: 'Notebook ASUS Gamer V16 RP213 RTX 5050 16"',
      url: 'https://www.kabum.com.br/produto/1056505/notebook-asus-v16',
      parser: 'kabum',
    };

    it('extrai preço com desconto (Pix), parcelamento e título via __NEXT_DATA__', () => {
      const html = `
        <html>
          <body>
            <script id="__NEXT_DATA__" type="application/json">
              {
                "props": {
                  "pageProps": {
                    "product": {
                      "id": 1056505,
                      "title": "Notebook Asus Gamer V16 Rp213 RTX 5050 Core 5 8GB Ram 512gb SSD Linux 16\\" 144hz",
                      "available": true,
                      "priceDetails": {
                        "priceWithDiscount": 6119.15,
                        "price": 7199.00,
                        "discountPercentage": 15
                      }
                    }
                  }
                }
              }
            </script>
          </body>
        </html>
      `;

      const oferta = parsearKabum(html, item);
      expect(oferta.loja).toBe('KaBuM!');
      expect(oferta.titulo.toLowerCase()).toContain('asus gamer v16');
      expect(oferta.precoAVista).toBe(6119.15);
      expect(oferta.precoParcelado).toBe(7199.00);
      expect(oferta.detalhesParcelamento).toContain('10x de R$ 719,90 sem juros');
      expect(oferta.url).toBe(item.url);
    });

    it('lança erro quando produto está esgotado / indisponível', () => {
      const html = `
        <html>
          <body>
            <script id="__NEXT_DATA__" type="application/json">
              {
                "props": {
                  "pageProps": {
                    "product": {
                      "title": "Notebook Asus Gamer V16",
                      "available": false,
                      "priceDetails": {
                        "priceWithDiscount": 6000
                      }
                    }
                  }
                }
              }
            </script>
          </body>
        </html>
      `;
      expect(() => parsearKabum(html, item)).toThrow(/esgotado|indisponível/i);
    });
  });

  describe('Loja Oficial ASUS Scraper', () => {
    const item: ItemCatalogo = {
      loja: 'Loja Oficial ASUS',
      produto: 'Notebook ASUS Gaming V16 V3607VM RP213 RTX 5050 16"',
      url: 'https://br.store.asus.com/notebook-asus-v16-v3607vm-rp213-matte-black.html',
      parser: 'asus',
    };

    it('extrai preço à vista e parcelado via JSON-LD e meta tags', () => {
      const html = `
        <html>
          <head>
            <meta property="product:price:amount" content="7299.00" />
            <script type="application/ld+json">
              {
                "@context": "https://schema.org/",
                "@type": "Product",
                "name": "Notebook ASUS Gaming V16, Intel Core 5, NVIDIA RTX 5050, 8GB, 512GB SSD, KeepOS, 16\\" FHD, Matte Black",
                "offers": {
                  "@type": "Offer",
                  "priceCurrency": "BRL",
                  "price": 6569.10,
                  "availability": "https://schema.org/InStock"
                }
              }
            </script>
          </head>
        </html>
      `;

      const oferta = parsearAsus(html, item);
      expect(oferta.loja).toBe('Loja Oficial ASUS');
      expect(oferta.titulo).toContain('ASUS Gaming V16');
      expect(oferta.precoAVista).toBe(6569.10);
      expect(oferta.precoParcelado).toBe(7299.00);
      expect(oferta.detalhesParcelamento).toContain('10x de R$ 729,90 sem juros');
    });

    it('lança erro quando produto está fora de estoque na Loja ASUS', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org/",
                "@type": "Product",
                "name": "Notebook ASUS Gaming V16",
                "offers": {
                  "@type": "Offer",
                  "price": 6569.10,
                  "availability": "https://schema.org/OutOfStock"
                }
              }
            </script>
          </head>
        </html>
      `;
      expect(() => parsearAsus(html, item)).toThrow(/esgotado|indisponível/i);
    });
  });

  describe('Magazine Luiza Scraper', () => {
    const item: ItemCatalogo = {
      loja: 'Magazine Luiza',
      produto: 'Notebook ASUS Gaming V16 V3607VH RTX 5050 16"',
      url: 'https://www.magazineluiza.com.br/notebook-asus-gaming-v16/p/bg8c73ekb2/',
      parser: 'magalu',
    };

    it('extrai preço e dados do produto via JSON-LD', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Notebook ASUS Gaming V16 V3607VH NVIDIA RTX 5050 Intel Core 5 16GB RAM 512GB SSD 16\\" 16:10",
                "offers": {
                  "@type": "Offer",
                  "availability": "InStock",
                  "price": "8244.15",
                  "priceCurrency": "BRL"
                }
              }
            </script>
          </head>
        </html>
      `;

      const oferta = parsearMagalu(html, item);
      expect(oferta.loja).toBe('Magazine Luiza');
      expect(oferta.titulo).toContain('ASUS Gaming V16');
      expect(oferta.precoAVista).toBe(8244.15);
      expect(oferta.detalhesParcelamento).toContain('10x de R$');
    });
  });

  describe('Shopee Scraper', () => {
    const item: ItemCatalogo = {
      loja: 'Shopee (Loja ASUS)',
      produto: 'Notebook ASUS TUF Gaming F16 RTX 5060 16"',
      url: 'https://shopee.com.br/product/1644527155/58213003561',
      parser: 'shopee',
    };

    it('extrai título da página e preço via meta tags', () => {
      const html = `
        <html>
          <head>
            <title>Notebook ASUS TUF Gaming F16 Intel i5 NVIDIA RTX 5060 16GB 512GB SSD 16\\" | Shopee Brasil</title>
            <meta property="product:price:amount" content="7999.00" />
          </head>
        </html>
      `;

      const oferta = parsearShopee(html, item);
      expect(oferta.loja).toBe('Shopee (Loja ASUS)');
      expect(oferta.titulo).toContain('ASUS TUF Gaming F16');
      expect(oferta.precoAVista).toBe(7999.00);
    });

    it('lança erro se o preço não for detectado devido a bot wall', () => {
      const html = `
        <html>
          <head>
            <title>Login Necessário | Shopee Brasil</title>
          </head>
        </html>
      `;
      expect(() => parsearShopee(html, item)).toThrow(/preço não encontrado/i);
    });
  });
});
