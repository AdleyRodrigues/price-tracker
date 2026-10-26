import { FonteScraper } from '../types/oferta';
import { amazonScraper } from './amazon';
import { asusScraper } from './asus';
import { kabumScraper } from './kabum';
import { magaluScraper } from './magalu';
import { mercadoLivreScraper } from './mercadolivre';
import { promobitScraper } from './promobit';
import { qncScraper } from './qnc';
import { shopeeScraper } from './shopee';

export const scrapers: FonteScraper[] = [
  amazonScraper,
  asusScraper,
  promobitScraper,
  mercadoLivreScraper,
  qncScraper,
  kabumScraper,
  magaluScraper,
  shopeeScraper,
];
