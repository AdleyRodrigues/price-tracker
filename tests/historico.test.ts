import { describe, expect, it } from 'vitest';
import { ofertaParaSnapshotCelular, ofertaParaSnapshotNotebook } from '../src/services/historico';
import type { Oferta } from '../src/types/oferta';

describe('historico', () => {
  it('mapeia oferta notebook para snapshot com SKU', () => {
    const oferta: Oferta = {
      loja: 'KaBuM!',
      titulo: 'Notebook ASUS TUF Gaming F16 FX608JHR RTX 5050 i5 16GB 512GB 16" 16:10',
      precoAVista: 7999,
      frete: 0,
      precoTotal: 7999,
      url: 'https://www.kabum.com.br/produto/1008856',
      fonteId: 'kabum',
    };

    const snap = ofertaParaSnapshotNotebook(oferta, '2026-03-18T12:00:00.000Z');
    expect(snap).toMatchObject({
      modulo: 'notebooks',
      produtoChave: 'fx608jhr',
      loja: 'KaBuM!',
      precoAvista: 7999,
      coletadoEm: '2026-03-18T12:00:00.000Z',
    });
  });

  it('mapeia oferta celular para snapshot com chave fina', () => {
    const oferta: Oferta = {
      loja: 'KaBuM!',
      titulo: 'Celular Xiaomi 17T Pro 512GB 12GB RAM Preto Global',
      precoAVista: 4299.9,
      frete: 0,
      precoTotal: 4299.9,
      url: 'https://www.kabum.com.br/produto/1053832',
      fonteId: 'catalogo-celular',
    };

    const snap = ofertaParaSnapshotCelular(oferta, '2026-03-18T12:00:00.000Z');
    expect(snap).toEqual({
      modulo: 'celular',
      produtoChave: 'xiaomi_17t_pro',
      loja: 'KaBuM!',
      titulo: oferta.titulo,
      precoAvista: 4299.9,
      precoTotal: 4299.9,
      frete: 0,
      url: oferta.url,
      fonteId: 'catalogo-celular',
      coletadoEm: '2026-03-18T12:00:00.000Z',
    });
  });

  it('retorna null quando o título não mapeia a um produto conhecido', () => {
    const oferta: Oferta = {
      loja: 'Amazon',
      titulo: 'Capa para celular Xiaomi',
      precoAVista: 49.9,
      frete: 0,
      precoTotal: 49.9,
      url: 'https://amazon.com.br/capa',
    };

    expect(ofertaParaSnapshotCelular(oferta)).toBeNull();
  });
});
