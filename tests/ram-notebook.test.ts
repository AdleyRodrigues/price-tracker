import { describe, expect, it } from 'vitest';
import {
  formatarRam,
  ramDoCatalogo,
  ramDoTextoPagina,
  resolverRamNotebook,
} from '../src/domain/ram-notebook';
import { textoFichaTecnica } from '../src/services/enriquecer-ram';

describe('ram-notebook', () => {
  it('1) usa a RAM do título quando existe', () => {
    expect(
      resolverRamNotebook({ titulo: 'ASUS TUF F16 i7 RTX 5050 8GB RAM 512GB SSD', chave: 'fx608jhr' })
    ).toEqual({ gb: 8, fonte: 'titulo' });
  });

  it('2) extrai RAM da ficha técnica da página', () => {
    expect(ramDoTextoPagina('Tamanho da memória RAM 16 GB Tipo DDR5')).toBe(16);
    expect(ramDoTextoPagina('Memória RAM: 32GB')).toBe(32);
    expect(ramDoTextoPagina('Memória: 16 GB DDR5 SO-DIMM')).toBe(16);
    expect(ramDoTextoPagina('Placa de vídeo RTX 4060 8 GB GDDR6')).toBeNull();

    const html = `<html><body><table id="productDetails_techSpec_section_1">
      <tr><th>Tamanho da memória RAM</th><td>16 GB</td></tr></table></body></html>`;
    expect(ramDoTextoPagina(textoFichaTecnica(html))).toBe(16);

    expect(
      resolverRamNotebook({ titulo: 'ASUS TUF A16 FA607NV RTX 4060', chave: 'fa607nv', textoPagina: '24 GB RAM' })
    ).toEqual({ gb: 24, fonte: 'pagina' });
  });

  it('3) usa consenso do histórico do mesmo SKU', () => {
    expect(
      resolverRamNotebook({
        titulo: 'Notebook ASUS TUF FX608JHR RTX 5050',
        chave: 'fx608jhr',
        titulosHistorico: ['... 16GB RAM ...', '... 16 GB RAM ...', '... 8GB RAM ...'],
      })
    ).toEqual({ gb: 16, fonte: 'historico' });
  });

  it('4) cai para a ficha técnica do part number', () => {
    expect(ramDoCatalogo('fa607nv')).toBe(16);
    const r = resolverRamNotebook({ titulo: 'ASUS TUF A16 FA607NV RTX 4060 Ryzen 7', chave: 'fa607nv' });
    expect(r).toEqual({ gb: 16, fonte: 'catalogo' });
    expect(formatarRam(r)).toBe('16 GB RAM (ficha técnica)');
  });

  it('5) nunca fica sem RAM (estimativa da série)', () => {
    const r = resolverRamNotebook({ titulo: 'ASUS TUF Gaming F16 RTX 5060', chave: 'fx699zz' });
    expect(r.fonte).toBe('estimado');
    expect(r.gb).toBeGreaterThan(0);
  });

  it('respeita marcação gravada na coleta', () => {
    expect(
      resolverRamNotebook({ titulo: 'ASUS TUF A16 FA607NV · 16 GB RAM (ficha técnica)', chave: 'fa607nv' })
    ).toEqual({ gb: 16, fonte: 'catalogo' });
  });
});
