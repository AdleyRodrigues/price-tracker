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
    it('formata campo individual com medalha, à vista, parcelado e link', () => {
      const field = formatarItemField(ofertas[0], 0);
      expect(field.name).toBe('🥇 1º — Amazon');
      expect(field.value).toContain('ASUS TUF Gaming A16');
      expect(field.value).toContain('💵 À vista: R$');
      expect(field.value).toContain('💳 Parcelado: R$ 5.900,00 (10x de R$ 590,00 sem juros)');
      expect(field.value).toContain('frete grátis');
      expect(field.value).toContain('**Total: R$ 5.600,00**');
      expect(field.value).toContain('[Ver oferta](https://www.amazon.com.br/dp/B0ASUSTUF1)');
    });

    it('formata cupom com destaque e preço final calculado', () => {
      const field = formatarItemField(ofertas[1], 1);
      expect(field.value).toContain('🎟️ Cupom: `TUF10` (Total c/ cupom: **R$ 4.949,10**)');
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
    it('cria estrutura com título "💻 Monitor ASUS 16:10 (RTX 4060 / 5050 / 5060)"', () => {
      const payload = montarPayloadDiscord(ofertas, '123456789', '01001-000');
      expect(payload).not.toBeNull();
      expect(payload?.content).not.toContain('<@123456789>');
      expect(payload?.content).toContain('Pódio atualizado (Top 3)');
      expect(payload?.embeds[0].title).toBe('💻 Monitor ASUS 16:10 (RTX 4060 / 5050 / 5060)');
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
      expect(payload?.content).toContain('OPORTUNIDADE ASUS 16:10 ABAIXO DE');
      expect(payload?.embeds[0].title).toBe('💻 Monitor ASUS 16:10 (RTX 4060 / 5050 / 5060)');
    });

    it('retorna null se lista de ofertas for vazia', () => {
      expect(montarPayloadDiscord([])).toBeNull();
    });
  });
});
