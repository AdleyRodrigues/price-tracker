import { afterEach, describe, expect, it } from 'vitest';
import { reefKabumScraper } from '../src/scrapers/providers/reef-kabum';
import { geckoScraper } from '../src/scrapers/providers/gecko';
import { apifyScraper } from '../src/scrapers/providers/apify';
import { mergeOfertas } from '../src/domain/merge-ofertas';
import { toOferta } from '../src/types/oferta';

const KEYS = [
  'REEF_API_KEY',
  'GECKO_API_KEY',
  'APIFY_API_KEY',
  'APIFY_ACTOR_KABUM',
] as const;

const backup: Record<string, string | undefined> = {};

afterEach(() => {
  for (const k of KEYS) {
    if (backup[k] === undefined) delete process.env[k];
    else process.env[k] = backup[k];
  }
});

describe('providers gate (sem chave)', () => {
  it('Reef / Gecko / Apify retornam [] sem env', async () => {
    for (const k of KEYS) {
      backup[k] = process.env[k];
      delete process.env[k];
    }

    await expect(reefKabumScraper.coletar()).resolves.toEqual([]);
    await expect(geckoScraper.coletar()).resolves.toEqual([]);
    await expect(apifyScraper.coletar()).resolves.toEqual([]);
  });
});

describe('mergeOfertas', () => {
  it('deduplica por URL canônica e mantém menor preço', () => {
    const a = toOferta({
      loja: 'KaBuM!',
      titulo: 'Notebook ASUS TUF F16 RTX 5060 16GB',
      precoAVista: 8000,
      frete: 0,
      url: 'https://www.kabum.com.br/produto/1/notebook?ref=a',
      fonteId: 'kabum',
    });
    const b = toOferta({
      loja: 'KaBuM!',
      titulo: 'Notebook ASUS TUF F16 RTX 5060 16GB',
      precoAVista: 7500,
      frete: 0,
      url: 'https://www.kabum.com.br/produto/1/notebook?ref=b',
      fonteId: 'reef-kabum',
    });
    const merged = mergeOfertas([a, b]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.precoAVista).toBe(7500);
  });
});
