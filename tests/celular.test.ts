import { describe, expect, it } from 'vitest';
import {
  aceitarOfertaCelular,
  ofertaBrutaValidaCelular,
  tituloBloqueadoCelular,
  validarTituloCelular,
} from '../src/domain/filtros-celular';
import {
  mapearJsonPromobitCelular,
  parsearBuscaAmazonCelular,
  parsearBuscaKabumCelular,
  parsearCardMercadoLivreCelular,
  parsearCardsZoomBuscape,
} from '../src/scrapers/celular';
import {
  formatarItemFieldCelular,
  montarPayloadDiscordCelular,
} from '../src/services/discord-celular';
import { Oferta } from '../src/types/oferta';
import * as cheerio from 'cheerio';

describe('Xiaomi Celular Tracker', () => {
  describe('filtros e validações de hardware', () => {
    it('aprova estritamente os 3 modelos alvos: Xiaomi 17T Pro, Xiaomi 15T Pro e Poco X8 Pro Max', () => {
      const validos = [
        'Smartphone Xiaomi 17T Pro 5G 512GB 12GB RAM',
        'Celular Xiaomi 17T Pro 1TB 16GB RAM Preto',
        'Xiaomi 15T Pro 512GB 5G - 12GB RAM - NFC - Versão Global - Pronta Entrega',
        'Smartphone Xiaomi 15T Pro 512GB Leica',
        'POCO X8 PRO MAX 5G NFC 512GB',
        'Celular Xiaomi Poco X8 Pro Max 256GB 12GB RAM',
        'Xiaomi Poco X8 Pro Max 12GB 512GB Preto',
        'Celular Xiaomi Pocophone Poco X8 Pro Max 512GB 12 GB',
      ];

      for (const t of validos) {
        expect(validarTituloCelular(t)).toBe(true);
        expect(tituloBloqueadoCelular(t)).toBe(false);
      }
    });

    it('rejeita acessórios, capas, películas, carregadores e peças', () => {
      const invalidos = [
        'Capa Capinha Anti Impacto Para Xiaomi 17T Pro',
        'Película de Vidro 3D Para Celular Xiaomi 15T Pro',
        'Carregador Turbo 120W Para Poco X8 Pro Max',
        'Cabo USB Tipo C Original Xiaomi 17T Pro',
        'Fone de Ouvido Bluetooth Earbuds Xiaomi 15T Pro',
        'Smartwatch Pulseira Poco X8 Pro Max',
        'Tela Display Touch Módulo Frontal Xiaomi 17T Pro',
        'Suporte de Celular Para Carro Poco X8 Pro Max',
        'Xiaomi 17T Pro Usado Com Detalhes',
        'Poco X8 Pro Max Réplica Perfeita',
      ];

      for (const t of invalidos) {
        expect(validarTituloCelular(t)).toBe(false);
        expect(tituloBloqueadoCelular(t)).toBe(true);
      }
    });

    it('rejeita categoricamente modelos que não sejam os 3 alvos (rejeita X8 Pro sem Max, 17T/15T sem Pro, Redmi, Poco X6)', () => {
      const outros = [
        'Xiaomi Poco X8 PRO 5G, 512GB, 12GB RAM', // X8 Pro SEM MAX
        'Poco X8 Pro 8GB RAM 256GB Green Original Global', // X8 Pro SEM MAX
        'Celular Xiaomi Pocophone Poco X8 Pro 256GB 8 GB', // X8 Pro SEM MAX
        'Xiaomi 17T 5G 256GB 8GB RAM Câmera Leica', // 17T normal sem Pro
        'Smartphone Xiaomi 17T 512GB Preto', // 17T normal sem Pro
        'Xiaomi 15T 5G 256GB 8GB RAM', // 15T normal sem Pro
        'Xiaomi Poco X8 5G, 256GB, 8GB RAM', // X8 normal sem Pro
        'Smartphone Samsung Galaxy S24 Ultra 512GB',
        'Apple iPhone 16 Pro Max 256GB',
        'Smartphone Xiaomi Redmi Note 13 Pro 5G 256GB',
        'Celular Xiaomi Poco X6 Pro 5G 512GB',
        'Poco F8 Pro 5G 256GB',
      ];

      for (const t of outros) {
        expect(validarTituloCelular(t)).toBe(false);
        expect(tituloBloqueadoCelular(t)).toBe(true);
      }
    });

    it('rejeita ofertas com preço abaixo do piso (R$ 1.800)', () => {
      const oferta: Oferta = {
        loja: 'Amazon',
        titulo: 'Smartphone Xiaomi 17T Pro 5G 512GB',
        precoAVista: 50.0,
        precoTotal: 50.0,
        frete: 0,
        url: 'https://amazon.com.br/dp/B0XIAOMI',
      };

      expect(aceitarOfertaCelular(oferta)).toBe(false);
    });
  });

  describe('scrapers de celular e mecanismos de busca', () => {
    it('mapeia JSON de oferta do Promobit para Xiaomi 17T Pro com cupom e parcelamento', () => {
      const item = {
        offer_title: 'Smartphone Xiaomi 17T Pro 5G 512GB 12GB RAM Leica',
        offer_price: 3899.0,
        offer_slug: 'smartphone-xiaomi-17t-pro-512gb-3000000',
        offer_status_name: 'APPROVED',
        offer_coupon: 'XIAOMI200',
        offer_installments: 10,
        offer_price_installment: 4199.0,
      };

      const oferta = mapearJsonPromobitCelular(item as any);
      expect(oferta).not.toBeNull();
      expect(oferta?.loja).toBe('Comunidade (Promobit)');
      expect(oferta?.precoAVista).toBe(3899.0);
      expect(oferta?.precoParcelado).toBe(4199.0);
      expect(oferta?.detalhesParcelamento).toContain('10x de R$');
      expect(oferta?.cupomTag).toBe('XIAOMI200');
    });

    it('extrai cards do Mercado Livre para Xiaomi 17T Pro', () => {
      const html = `
        <div class="poly-card">
          <a class="poly-component__title" href="https://produto.mercadolivre.com.br/MLB-123456-xiaomi-17t-pro">
            Smartphone Xiaomi 17T Pro 5G 512GB Dual SIM
          </a>
          <div class="poly-price__current">
            <span class="andes-money-amount__fraction">3.999</span>
            <span class="andes-money-amount__cents">90</span>
          </div>
          <span class="poly-price__installments">em 10x R$ 399,99 sem juros</span>
        </div>
      `;

      const $ = cheerio.load(html);
      const oferta = parsearCardMercadoLivreCelular($('.poly-card'));
      expect(oferta).not.toBeNull();
      expect(oferta?.loja).toBe('Mercado Livre');
      expect(oferta?.titulo).toContain('Xiaomi 17T Pro');
      expect(oferta?.precoAVista).toBe(3999.90);
      expect(oferta?.detalhesParcelamento).toContain('10x R$ 399,99 sem juros');
    });

    it('extrai resultados de busca da Amazon para Xiaomi 17T Pro', () => {
      const html = `
        <html>
          <body>
            <div data-component-type="s-search-result">
              <h2>
                <a href="/dp/B0XIAOMI17T">
                  <span>Smartphone Xiaomi 17T Pro 5G 512GB Preto</span>
                </a>
              </h2>
              <span class="a-price">
                <span class="a-offscreen">R$ 4.199,00</span>
                <span class="a-price-whole">4.199</span>
                <span class="a-price-fraction">00</span>
              </span>
            </div>
          </body>
        </html>
      `;

      const ofertas = parsearBuscaAmazonCelular(html);
      expect(ofertas).toHaveLength(1);
      expect(ofertas[0].loja).toBe('Amazon');
      expect(ofertas[0].titulo).toContain('Xiaomi 17T Pro');
      expect(ofertas[0].precoAVista).toBe(4199.00);
    });

    it('extrai ofertas de busca da KaBuM! via Next.js catalogServer', () => {
      const mockNextData = JSON.stringify({
        props: {
          pageProps: {
            data: {
              catalogServer: {
                data: [
                  {
                    code: 1053423,
                    name: 'Celular Xiaomi 17T Pro De 512gb 12gb Ram - Azul (global)',
                    friendlyName: 'celular-xiaomi-17t-pro-azul',
                    available: true,
                    price: 6110.00,
                    priceWithDiscount: 5499.00,
                    maxInstallment: {
                      amount: 10,
                      installment: 611.00,
                    },
                  },
                  {
                    code: 999999,
                    name: 'Capa Case para Celular Xiaomi 17T Pro',
                    friendlyName: 'capa-xiaomi-17t-pro',
                    available: true,
                    price: 50.00,
                    priceWithDiscount: 45.00,
                  },
                ],
              },
            },
          },
        },
      });

      const html = `<html><body><script id="__NEXT_DATA__" type="application/json">${mockNextData}</script></body></html>`;
      const ofertas = parsearBuscaKabumCelular(html);

      expect(ofertas).toHaveLength(1);
      expect(ofertas[0].loja).toBe('KaBuM!');
      expect(ofertas[0].titulo).toContain('Xiaomi 17T Pro');
      expect(ofertas[0].precoAVista).toBe(5499.00);
      expect(ofertas[0].precoParcelado).toBe(6110.00);
      expect(ofertas[0].detalhesParcelamento).toContain('10x de R$');
    });

    it('extrai ofertas dos comparadores e mecanismos de busca Zoom e Buscapé respeitando os 3 modelos alvos', () => {
      const htmlZoom = `
        <html>
          <body>
            <a href="/celular/celular-xiaomi-15t-pro-5g-512gb-12-gb" data-testid="product-card">
              <h2 data-testid="product-card::name">Celular Xiaomi 15T Pro 5G 512GB 12 GB</h2>
              <span data-testid="product-card::price">R$ 7.199,99</span>
              <span>Via Magazine Luiza</span>
              <span>10x de R$ 800,00</span>
            </a>
            <a href="/celular/celular-xiaomi-poco-x8-pro-max-256gb" data-testid="product-card">
              <h2 data-testid="product-card::name">Celular Xiaomi Poco X8 Pro Max 256GB 12 GB</h2>
              <span data-testid="product-card::price">R$ 3.249,00</span>
              <span>Via Amazon</span>
            </a>
            <a href="/celular/celular-xiaomi-poco-x8-pro-sem-max" data-testid="product-card">
              <h2 data-testid="product-card::name">Celular Xiaomi Poco X8 Pro 256GB 8 GB</h2>
              <span data-testid="product-card::price">R$ 2.500,00</span>
              <span>Via SuperDig</span>
            </a>
          </body>
        </html>
      `;

      const ofertasZoom = parsearCardsZoomBuscape(htmlZoom, 'zoom');
      expect(ofertasZoom).toHaveLength(2); // O terceiro é Poco X8 Pro sem Max e DEVE ser descartado!
      expect(ofertasZoom[0].loja).toBe('Magazine Luiza (via Zoom)');
      expect(ofertasZoom[0].titulo).toContain('Xiaomi 15T Pro');
      expect(ofertasZoom[0].precoAVista).toBe(7199.99);
      expect(ofertasZoom[0].detalhesParcelamento).toContain('10x de R$ 800,00');
      expect(ofertasZoom[0].url).toContain('https://www.zoom.com.br');

      expect(ofertasZoom[1].loja).toBe('Amazon (via Zoom)');
      expect(ofertasZoom[1].titulo).toContain('Poco X8 Pro Max');
      expect(ofertasZoom[1].precoAVista).toBe(3249.00);

      const htmlBuscape = `
        <html>
          <body>
            <a href="/lead?oid=1581595566" data-testid="product-card">
              <h2>Smartphone Xiaomi 17T Pro 5G 12GB RAM 512GB Câmera Leica</h2>
              <span class="price">R$ 5.699,91</span>
            </a>
          </body>
        </html>
      `;

      const ofertasBuscape = parsearCardsZoomBuscape(htmlBuscape, 'buscape');
      expect(ofertasBuscape).toHaveLength(1);
      expect(ofertasBuscape[0].loja).toBe('Buscapé');
      expect(ofertasBuscape[0].titulo).toContain('Xiaomi 17T Pro');
      expect(ofertasBuscape[0].precoAVista).toBe(5699.91);
      expect(ofertasBuscape[0].url).toContain('https://www.buscape.com.br/lead');
    });
  });

  describe('discord notification service', () => {
    it('monta payload com pódio e branding Xiaomi', () => {
      const ofertas: Oferta[] = [
        {
          loja: 'Amazon',
          titulo: 'Smartphone Xiaomi 17T Pro 5G 512GB Preto',
          precoAVista: 3999.0,
          frete: 0,
          precoTotal: 3999.0,
          url: 'https://amazon.com.br/dp/B0XIAOMI',
        },
      ];

      const payload = montarPayloadDiscordCelular(ofertas, '123456789', '01001-000');
      expect(payload).not.toBeNull();
      expect(payload?.embeds[0].title).toBe('📱 Monitor Xiaomi & Poco (17T Pro | 15T Pro | Poco X8 Pro Max)');
      expect(payload?.embeds[0].color).toBe(0xff6900); // Laranja Xiaomi
      expect(payload?.embeds[0].fields[0].name).toContain('1º');
      expect(payload?.embeds[0].fields[0].name).toContain('Amazon');
    });

    it('formata badges de hardware específicos de celular no item do Discord', () => {
      const oferta: Oferta = {
        loja: 'KaBuM!',
        titulo: 'Celular Xiaomi 17t Pro De 512gb 12gb Ram De 6.83" 50+50+12mp 32mp - Negro (global)',
        precoAVista: 5499.0,
        precoParcelado: 6110.0,
        detalhesParcelamento: '10x de R$ 611,00 sem juros',
        frete: 0,
        precoTotal: 5499.0,
        url: 'https://www.kabum.com.br/produto/1053424',
      };

      const field = formatarItemFieldCelular(oferta, 0);
      expect(field.name).toContain('1º');
      expect(field.name).toContain('KaBuM!');
      expect(field.value).toContain('📱 **Modelo:** `Xiaomi 17T Pro`');
      expect(field.value).toContain('💾 **ROM:** `512GB`');
      expect(field.value).toContain('⚡ **RAM:** `12 GB RAM`');
      expect(field.value).toContain('🌐 `Global`');
    });

    it('dispara menção sonora quando rompe o threshold de alerta crítico', () => {
      const ofertas: Oferta[] = [
        {
          loja: 'Mercado Livre',
          titulo: 'Smartphone Xiaomi 17T Pro 5G 512GB',
          precoAVista: 3500.0,
          frete: 0,
          precoTotal: 3500.0,
          url: 'https://mercadolivre.com.br/item',
        },
      ];

      const payload = montarPayloadDiscordCelular(ofertas, '123456789', '01001-000');
      expect(payload).not.toBeNull();
      expect(payload?.content).toContain('<@123456789>');
      expect(payload?.content).toContain('OPORTUNIDADE ABAIXO DE');
    });
  });
});
