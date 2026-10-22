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
  parsearCardMercadoLivreCelular,
} from '../src/scrapers/celular';
import { montarPayloadDiscordCelular } from '../src/services/discord-celular';
import { Oferta } from '../src/types/oferta';
import * as cheerio from 'cheerio';

describe('Xiaomi Celular Tracker', () => {
  describe('filtros e validações de hardware', () => {
    it('aprova títulos válidos de Xiaomi 17T Pro, Xiaomi 15T Pro e Poco X8 Pro Max', () => {
      const validos = [
        'Smartphone Xiaomi 17T Pro 5G 512GB 12GB RAM',
        'Celular Xiaomi 17T Pro 1TB 16GB RAM Preto',
        'Xiaomi 15T Pro 512GB 5G - 12GB RAM - NFC - Versão Global - Pronta Entrega',
        'Smartphone Xiaomi 15T Pro 512GB Leica',
        'POCO X8 PRO MAX 5G NFC 512GB',
        'Celular Xiaomi Poco X8 Pro Max 256GB 12GB RAM',
        'Xiaomi Poco X8 Pro Max 12GB 512GB Preto',
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

    it('rejeita modelos não alvo (ex: 17T normal, 15T normal, Poco X8 Pro sem Max, Redmi, Poco X6)', () => {
      const outros = [
        'Xiaomi 17T 5G 256GB 8GB RAM Câmera Leica', // 17T normal sem Pro
        'Smartphone Xiaomi 17T 512GB Preto', // 17T normal
        'Xiaomi 15T 5G 256GB 8GB RAM', // 15T normal sem Pro
        'Xiaomi Poco X8 PRO 5G, 512GB, 12GB RAM', // X8 Pro sem Max
        'Smartphone Xiaomi 14T Pro 5G 512GB Leica', // 14T Pro
        'Smartphone Samsung Galaxy S24 Ultra 512GB',
        'Apple iPhone 16 Pro Max 256GB',
        'Smartphone Xiaomi Redmi Note 13 Pro 5G 256GB',
        'Celular Xiaomi Poco X6 Pro 5G 512GB',
        'Poco F8 Pro 5G 256GB',
      ];

      for (const t of outros) {
        expect(validarTituloCelular(t)).toBe(false);
      }
    });

    it('rejeita ofertas com preço abaixo do piso (R$ 1.800)', () => {
      const oferta: Oferta = {
        loja: 'Amazon',
        titulo: 'Smartphone Xiaomi 17T Pro 5G 512GB',
        precoAVista: 50.0, // preço de capa/acessório
        precoTotal: 50.0,
        frete: 0,
        url: 'https://amazon.com.br/dp/B0XIAOMI',
      };

      expect(aceitarOfertaCelular(oferta)).toBe(false);
    });
  });

  describe('scrapers de celular', () => {
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
      expect(payload?.embeds[0].fields[0].name).toBe('🥇 1º — Amazon');
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
