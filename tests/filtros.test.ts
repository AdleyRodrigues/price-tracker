import { describe, expect, it } from 'vitest';
import {
  aceitarOferta,
  calcularPrecoComCupom,
  extrairInformacoesCupom,
  ofertaBrutaValida,
  ofertaEncerrada,
  precoAbaixoDoPiso,
  tituloBloqueado,
} from '../src/domain/filtros';
import { Oferta } from '../src/types/oferta';

describe('filtros domain', () => {
  describe('tituloBloqueado', () => {
    it('bloqueia desktops, pc gamer, placas de vídeo avulsas e GPUs', () => {
      expect(tituloBloqueado('PC Gamer Desktop Intel Core i5 16GB ASUS TUF RTX 4060')).toBe(true);
      expect(tituloBloqueado('Desktop Gamer Asus TUF RTX 4060')).toBe(true);
      expect(tituloBloqueado('Placa de Vídeo ASUS TUF RTX 4060 8GB GDDR6')).toBe(true);
      expect(tituloBloqueado('GPU ASUS TUF Gaming GeForce RTX 4060')).toBe(true);
    });

    it('bloqueia periféricos e acessórios (mesa, suporte, cooler, gabinete, fonte, monitor, teclado)', () => {
      expect(tituloBloqueado('Mesa Gamer para Notebook ASUS TUF RTX 4060')).toBe(true);
      expect(tituloBloqueado('Suporte Articulado para Notebook ASUS TUF RTX 4060')).toBe(true);
      expect(tituloBloqueado('Cooler para Notebook ASUS TUF Gamer RTX 4060')).toBe(true);
      expect(tituloBloqueado('Gabinete Gamer com Suporte para Laptop ASUS TUF RTX 4060')).toBe(true);
      expect(tituloBloqueado('Fonte Carregador para Notebook ASUS TUF RTX 4060')).toBe(true);
      expect(tituloBloqueado('Monitor Gamer 144Hz para Notebook ASUS TUF RTX 4060')).toBe(true);
      expect(tituloBloqueado('Teclado Mecânico RGB para Notebook ASUS TUF RTX 4060')).toBe(true);
    });

    it('bloqueia produtos usados', () => {
      expect(tituloBloqueado('Notebook Gamer ASUS TUF A15 RTX 4060 Usado')).toBe(true);
    });

    it('bloqueia itens sem menção a notebook ou laptop', () => {
      expect(tituloBloqueado('ASUS TUF Gaming A15 RTX 4060 16GB SSD 512GB')).toBe(true);
    });

    it('bloqueia notebooks de marcas não permitidas (HP, Apple, Samsung, etc.)', () => {
      expect(tituloBloqueado('Notebook Gamer HP Omen 16 RTX 4060 WUXGA 16:10')).toBe(true);
      expect(tituloBloqueado('MacBook Pro Apple M3 Max 16"')).toBe(true);
      expect(tituloBloqueado('Notebook Samsung Galaxy Book4 Ultra RTX 4070')).toBe(true);
    });

    it('aceita notebooks das marcas e famílias suportadas (ASUS TUF, Avell, Acer Nitro V16)', () => {
      expect(
        tituloBloqueado('Notebook Gamer Avell Storm 560 Intel Core i7 RTX 5060 16GB 16" 16:10')
      ).toBe(false);
      expect(
        tituloBloqueado('Notebook Avell ION A70 AMD Ryzen 7 RTX 5060 16GB 16" WUXGA')
      ).toBe(false);
      // Variações curtas de marketplace / loja oficial (sem "Notebook" ou sem "RTX")
      expect(tituloBloqueado('Avell Storm 560 R7')).toBe(false);
      expect(tituloBloqueado('Avell STORM 560 RTX 5060')).toBe(false);
      expect(tituloBloqueado('Notebook Avell Storm 560')).toBe(false);
      // Lenovo e ASUS Gaming V16 fora do escopo
      expect(
        tituloBloqueado('Notebook Gamer Lenovo LOQ 15 Intel Core i5 RTX 5060 16GB 15.6"')
      ).toBe(true);
      expect(
        tituloBloqueado('Notebook Gamer Acer Nitro V16 ANV16-41 Ryzen 7 RTX 5060 16"')
      ).toBe(false);
      expect(
        tituloBloqueado('Notebook ASUS Gaming V16 V3607VH RTX 5060 Intel Core 5 16GB 16"')
      ).toBe(true);
    });

    it('bloqueia notebooks ASUS que NÃO tenham tela 16:10 (ex: 15.6", 17.3", A15, F15 com 16:9)', () => {
      expect(tituloBloqueado('Notebook Gamer ASUS TUF Gaming A15 FA507NV RTX 4060 15.6 FHD')).toBe(true);
      expect(tituloBloqueado('Laptop ASUS TUF Gaming F15 Intel Core i7 RTX 4060 15.6"')).toBe(true);
      expect(tituloBloqueado('Notebook ASUS ROG Strix G17 RTX 4060 17.3" FHD')).toBe(true);
    });

    it('bloqueia notebooks com outras GPUs (ex: 3050, 4050, 4070)', () => {
      expect(tituloBloqueado('Notebook Gamer ASUS TUF Gaming A16 RTX 3050 16"')).toBe(true);
      expect(tituloBloqueado('Notebook Gamer ASUS ROG Strix G16 RTX 4050 16:10')).toBe(true);
      expect(tituloBloqueado('Laptop Gamer ASUS Zephyrus G16 RTX 4070 16" WQXGA')).toBe(true);
    });

    it('aceita qualquer notebook ASUS legítimo com tela 16:10 e RTX 4060, RTX 5050 ou RTX 5060', () => {
      expect(
        tituloBloqueado(
          'Notebook Asus Tuf Gaming F16 Fx608jhr Nvidia Rtx 5050 Intel Core i7 14650hx 8gb Ram 512gb Ssd Linux Keepos Tela 16" 165hz Nível Ips Cinza - Rv019'
        )
      ).toBe(false);
      expect(
        tituloBloqueado(
          'Notebook ASUS TUF Gaming F16, Intel Core i5 RTX 5050, 8 GB, 512 GB SSD, KeepOS, 16.0” FHD, Jaeger Gray - FX608JHR-RV124'
        )
      ).toBe(false);
      expect(
        tituloBloqueado(
          'Notebook ASUS TUF Gaming A16 AMD Ryzen 7 16GB 512GB SSD RTX 4060 16" WUXGA 16:10'
        )
      ).toBe(false);
      expect(
        tituloBloqueado(
          'Notebook ASUS Vivobook Pro 16 OLED Intel Core i9 32GB RTX 4060 3.2K 16:10'
        )
      ).toBe(false);
      expect(
        tituloBloqueado(
          'Notebook ASUS TUF Gaming F16, Intel Core i7 14650HX, RTX 5060, 16GB, 512GB SSD, KeepOS, 16" FHD'
        )
      ).toBe(false);
    });

    it('bloqueia séries fora de escopo (G16, M16, ROG Strix)', () => {
      expect(
        tituloBloqueado(
          'Laptop ASUS ROG Strix G16 Intel Core i9 16GB RAM 1TB SSD RTX 5060 16 polegadas 240Hz'
        )
      ).toBe(true);
      expect(
        tituloBloqueado(
          'Notebook Gamer Asus Rog Strix G16, Core Ultra 9, Nvidia Rtx™ 5060, 32 Gb Ram, 1.0 Tb'
        )
      ).toBe(true);
      expect(
        tituloBloqueado(
          'Notebook ASUS TUF Gaming G16 RTX 5050 16:10'
        )
      ).toBe(true);
      expect(
        tituloBloqueado(
          'Notebook ASUS ROG Strix G16 G615JM RTX 5060 16GB 16"'
        )
      ).toBe(true);
    });

    it('bloqueia ASUS Gaming V16 / V3607 (TGP capado)', () => {
      expect(
        tituloBloqueado(
          'Laptop ASUS Gamer V16 V3607VH RTX 5050 Core 5 16GB RAM 512GB SSD 1920x1200'
        )
      ).toBe(true);
      expect(
        tituloBloqueado(
          'Notebook Asus Gaming V16 V3607vh Nvidia Rtx 5050 Intel Core 5 16gb Ram 512gb Ssd Windows 11'
        )
      ).toBe(true);
    });

    it('bloqueia séries premium fora do escopo (ROG Strix G16, Zephyrus M16)', () => {
      expect(
        tituloBloqueado(
          'Notebook ASUS ROG Strix G16 G614JVR Intel Core i9 RTX 4060 16GB RAM'
        )
      ).toBe(true);
      expect(
        tituloBloqueado(
          'Notebook ASUS ROG Zephyrus M16 GU604VI RTX 4070 32GB'
        )
      ).toBe(true);
    });

    it('bloqueia títulos vazios ou nulos', () => {
      expect(tituloBloqueado('')).toBe(true);
    });
  });

  describe('precoAbaixoDoPiso', () => {
    it('bloqueia preços menores que 3500 (piso mínimo para notebooks gamer)', () => {
      expect(precoAbaixoDoPiso(3499.99)).toBe(true);
      expect(precoAbaixoDoPiso(2500)).toBe(true);
      expect(precoAbaixoDoPiso(800)).toBe(true);
      expect(precoAbaixoDoPiso(0)).toBe(true);
      expect(precoAbaixoDoPiso(-50)).toBe(true);
    });

    it('bloqueia NaN e Infinity', () => {
      expect(precoAbaixoDoPiso(Number.NaN)).toBe(true);
      expect(precoAbaixoDoPiso(Number.POSITIVE_INFINITY)).toBe(true);
    });

    it('aceita preços iguais ou superiores a 3500', () => {
      expect(precoAbaixoDoPiso(3500)).toBe(false);
      expect(precoAbaixoDoPiso(4899.9)).toBe(false);
      expect(precoAbaixoDoPiso(6137.0)).toBe(false);
    });
  });

  describe('ofertaEncerrada', () => {
    it('detecta palavras-chave de encerramento', () => {
      expect(ofertaEncerrada('Oferta encerrada')).toBe(true);
      expect(ofertaEncerrada('Promoção expirada')).toBe(true);
      expect(ofertaEncerrada('Produto esgotado')).toBe(true);
      expect(ofertaEncerrada('Status: FINISHED')).toBe(true);
      expect(ofertaEncerrada('Status: CLOSED')).toBe(true);
      expect(ofertaEncerrada('Item inativo')).toBe(true);
      expect(ofertaEncerrada('Produto indisponível na região')).toBe(true);
    });

    it('retorna false para ofertas ativas', () => {
      expect(ofertaEncerrada('APPROVED')).toBe(false);
      expect(ofertaEncerrada('Em estoque')).toBe(false);
      expect(ofertaEncerrada('Ir à loja')).toBe(false);
      expect(ofertaEncerrada('')).toBe(false);
    });
  });

  describe('ofertaBrutaValida', () => {
    it('valida oferta correta de notebook ASUS 16:10', () => {
      expect(
        ofertaBrutaValida(
          'Notebook Gamer ASUS TUF Gaming A16 RTX 4060 16GB SSD 512GB',
          5499.0,
          'APPROVED'
        )
      ).toBe(true);
    });

    it('rejeita se título for bloqueado', () => {
      expect(
        ofertaBrutaValida(
          'Placa de Vídeo ASUS TUF RTX 4060 8GB GDDR6',
          4200.0,
          'APPROVED'
        )
      ).toBe(false);
    });

    it('rejeita se preço estiver abaixo do piso', () => {
      expect(
        ofertaBrutaValida(
          'Notebook Gamer ASUS TUF A16 RTX 4060',
          1800.0,
          'APPROVED'
        )
      ).toBe(false);
    });

    it('rejeita se status indicar encerrada', () => {
      expect(
        ofertaBrutaValida(
          'Notebook Gamer ASUS TUF F16 RTX 4060',
          4999.0,
          'Oferta encerrada'
        )
      ).toBe(false);
    });
  });

  describe('cupons de desconto', () => {
    it('extrai cupom por código explícito', () => {
      const info = extrairInformacoesCupom('Use o cupom TUF10 para ganhar 10% de desconto');
      expect(info.cupomTag).toBe('TUF10');
      expect(info.percentualDesconto).toBe(10);
    });

    it('extrai cupom com valor fixo', () => {
      const info = extrairInformacoesCupom('Desconto de R$ 300 com cupom ASUS300');
      expect(info.cupomTag).toBe('ASUS300');
      expect(info.cupomDesconto).toBe(300);
    });

    it('extrai código Amazon no formato Salve o cupom R$170 : 170OFF', () => {
      const info = extrairInformacoesCupom(
        'Faça login para resgatar. Salve o cupom R$170 : 170OFF. Válido na sua primeira compra na Amazon'
      );
      expect(info.cupomTag).toBe('170OFF');
      expect(info.cupomDesconto).toBe(170);
    });

    it('calcula precoComCupom com porcentagem', () => {
      const info = { cupomTag: 'TUF10', percentualDesconto: 10 };
      const res = calcularPrecoComCupom(5000, info);
      expect(res.cupomTag).toBe('TUF10');
      expect(res.cupomDesconto).toBe(500);
      expect(res.precoComCupom).toBe(4500);
    });

    it('calcula precoComCupom com valor fixo', () => {
      const info = { cupomTag: 'PROMO200', cupomDesconto: 200 };
      const res = calcularPrecoComCupom(5200, info);
      expect(res.cupomTag).toBe('PROMO200');
      expect(res.cupomDesconto).toBe(200);
      expect(res.precoComCupom).toBe(5000);
    });
  });

  describe('aceitarOferta', () => {
    it('aceita oferta completa e válida', () => {
      const oferta: Oferta = {
        loja: 'Amazon',
        titulo: 'Notebook Gamer ASUS TUF Gaming A16 FA607NV RTX 4060',
        precoAVista: 5200.0,
        frete: 0,
        precoTotal: 5200.0,
        url: 'https://www.amazon.com.br/dp/B0ASUSTUF1',
      };
      expect(aceitarOferta(oferta)).toBe(true);
    });

    it('rejeita oferta com frete negativo ou inválido', () => {
      const ofertaInvalida: Oferta = {
        loja: 'Amazon',
        titulo: 'Notebook Gamer ASUS TUF A16 RTX 4060',
        precoAVista: 5200.0,
        frete: -10,
        precoTotal: 5190.0,
        url: 'https://example.com',
      };
      expect(aceitarOferta(ofertaInvalida)).toBe(false);
    });
  });
});
