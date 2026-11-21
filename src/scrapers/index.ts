import { FonteScraper } from '../types/oferta';
import { amazonScraper } from './amazon';
import { asusScraper } from './asus';
import { kabumScraper } from './kabum';
import { magaluScraper } from './magalu';
import { mercadoLivreScraper } from './mercadolivre';
import { promobitScraper } from './promobit';
import { qncScraper } from './qnc';
import { shopeeScraper } from './shopee';
import { apifyScraper } from './providers/apify';
import { geckoScraper } from './providers/gecko';
import { reefKabumScraper } from './providers/reef-kabum';

/**
 * Manuais primeiro; APIs pagas depois (no-op sem chave).
 * Dedupe final em coletarOfertas → mergeOfertas.
 */
export const scrapers: FonteScraper[] = [
  amazonScraper,
  asusScraper,
  promobitScraper,
  mercadoLivreScraper,
  qncScraper,
  kabumScraper,
  magaluScraper,
  shopeeScraper,
  // Providers (gated por .env)
  reefKabumScraper,
  geckoScraper,
  apifyScraper,
];
