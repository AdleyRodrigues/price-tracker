import { describe, expect, it } from 'vitest';
import {
  corDoVencedor,
  formatarItemField,
  gerarRankingTexto,
  montarPayloadDiscord,
} from '../src/services/discord';
import { Oferta } from '../src/types/oferta';

describe('discord service', () => {
  const ofertas: Oferta[] = [
    {
      loja: 'Amazon',
      titulo: 'Notebook Gamer ASUS TUF Gaming A16 16" 16:10 Ryzen 7 RTX 4060 16GB',
      precoAVista: 5600.0,
      precoParcelado: 5900.0,
      detalhesParcelamento: '10x de R$ 590,00 sem juros',
      frete: 0,
      precoTotal: 5600.0,
      url: 'https://www.amazon.com.br/dp/B0ASUSTUF1',
    },
    {
      loja: 'Comunidade (Promobit)',
      titulo: 'Notebook ASUS TUF Gaming A16 16" RTX 5050 16GB 512GB SSD',
      precoAVista: 5499.0,
      frete: 100.0,
      precoTotal: 5599.0,
      url: 'https://www.promobit.com.br/oferta/tuf-rtx-5050',
      cupomTag: 'TUF10',
      precoComCupom: 4949.10,
    },
    {
      loja: 'Loja Oficial LG',
      titulo: 'Laptop ASUS TUF Gaming F16 16" Intel Core i7 RTX 4060',
      precoAVista: 5800.0,
      frete: 0,
      precoTotal: 5800.0,
      url: 'https://example.com/tuf-f16',
    },
  ];

  describe('corDoVencedor', () => {
    it('retorna cor da Amazon para Amazon', () => {
      expect(corDoVencedor('Amazon')).toBe(0xff9900);
    });

    it('retorna cor da LG para Loja Oficial LG', () => {
      expect(corDoVencedor('Loja Oficial LG')).toBe(0xa50034);
    });

    it('retorna cor do Promobit para Comunidade', () => {
      expect(corDoVencedor('Comunidade (Promobit)')).toBe(0xe67e22);
    });
  });

  describe('formatarItemField', () => {
    it('formata campo individual com medalha, à vista, parcelado, hardware, TGP e link', () => {
      const field = formatarItemField(ofertas[0], 0);
      expect(field.name).toBe('🥇 1º — Amazon');
      expect(field.value).toContain('ASUS TUF Gaming A16');
      expect(field.value).toContain('⚡ **TGP:** `115W Full Power`');
      expect(field.value).toContain('📺 **HDMI:** `HDMI 2.1 FRL (48 Gbps) (4K 120Hz)`');
      expect(field.value).toContain('💵 À vista: R$');
      expect(field.value).toContain('💳 Parcelado: R$ 5.900,00 (10x de R$ 590,00 sem juros)');
      expect(field.value).toContain('frete grátis');
      expect(field.value).toContain('**Total: R$ 5.600,00**');
      expect(field.value).toContain('[Ver oferta](https://www.amazon.com.br/dp/B0ASUSTUF1)');
    });

    it('formata cupom com destaque e preço final calculado', () => {
      const field = formatarItemField(ofertas[1], 1);
      expect(field.value).toContain('🎟️ Cupom: `TUF10` (Total c/ cupom: **R$ 5.049,10**)');
    });

    it('inclui alerta de 8 GB RAM para modelos que engasgam em 4K', () => {
      const oferta8gb: Oferta = {
        loja: 'KaBuM!',
        titulo: 'Notebook ASUS TUF Gaming F16 FX608JHR Intel Core i7 8GB RAM 512GB SSD RTX 5050',
        precoAVista: 7999.0,
        precoTotal: 7999.0,
        frete: 0,
        url: 'https://example.com/8gb',
      };
      const field = formatarItemField(oferta8gb, 0);
      expect(field.value).toContain('[UPGRADE OBRIGATÓRIO]');
      expect(field.value).toContain('8 GB RAM');
      expect(field.value).toContain('R$ 200');
    });

    it('inclui alerta de TGP abaixo de 100W para ASUS V16', () => {
      const ofertaV16: Oferta = {
        loja: 'ASUS',
        titulo: 'Notebook ASUS Gaming V16 V3607VH Intel Core i7 16GB 512GB RTX 5060',
        precoAVista: 6999.0,
        precoTotal: 6999.0,
        frete: 0,
        url: 'https://example.com/v16',
      };
      const field = formatarItemField(ofertaV16, 0);
      expect(field.value).toContain('Slim Reduzido');
      expect(field.value).toContain('abaixo de 100W');
    });
  });

  describe('gerarRankingTexto', () => {
    it('formata cada posição com medalha, valores discriminados e link', () => {
      const texto = gerarRankingTexto(ofertas);
      expect(texto).toContain('🥇 1º — Amazon');
      expect(texto).toContain('À vista');
      expect(texto).toContain('**Total: R$');
      expect(texto).toContain('[Ver oferta](https://www.amazon.com.br/dp/B0ASUSTUF1)');
      expect(texto).toContain('Cupom: `TUF10`');
    });
  });

  describe('montarPayloadDiscord', () => {
    it('cria estrutura com título "💻 Monitor Notebooks Gamer 4K TV (RTX 5060 / 5050 / 4060)"', () => {
      const payload = montarPayloadDiscord(ofertas, '123456789', '01001-000');
      expect(payload).not.toBeNull();
      expect(payload?.content).not.toContain('<@123456789>');
      expect(payload?.content).toContain('Pódio atualizado (Top 3)');
      expect(payload?.embeds[0].title).toBe('💻 Monitor Notebooks Gamer 4K TV (RTX 5060 / 5050 / 4060)');
      expect(payload?.embeds[0].description).toContain('01001-000');
      expect(payload?.embeds[0].fields).toHaveLength(3);
      expect(payload?.embeds[0].fields[0].name).toBe('🥇 1º — Amazon');
      expect(payload?.embeds[0].footer.text).toContain('01001-000');
    });

    it('dispara menção com ping sonoro quando o menor preço rompe o piso de alerta crítico', () => {
      const superOferta: Oferta = {
        loja: 'Amazon',
        titulo: 'Notebook Gamer ASUS TUF A16 16" RTX 4060',
        precoAVista: 4200.0,
        frete: 0,
        precoTotal: 4200.0,
        url: 'https://www.amazon.com.br/dp/B0ASUSTUF1',
      };
      const payload = montarPayloadDiscord([superOferta, ...ofertas], '123456789', '01001-000');
      expect(payload).not.toBeNull();
      expect(payload?.content).toContain('<@123456789>');
      expect(payload?.content).toContain('OPORTUNIDADE NOTEBOOK 4K ABAIXO DE');
      expect(payload?.embeds[0].title).toBe('💻 Monitor Notebooks Gamer 4K TV (RTX 5060 / 5050 / 4060)');
    });

    it('retorna null se lista de ofertas for vazia', () => {
      expect(montarPayloadDiscord([])).toBeNull();
    });
  });
});
