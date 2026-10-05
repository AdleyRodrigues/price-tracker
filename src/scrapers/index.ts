import { FonteScraper } from '../types/oferta';
import { amazonScraper } from './amazon';
import { asusScraper } from './asus';
import { kabumScraper } from './kabum';
import { magaluScraper } from './magalu';
import { promobitScraper } from './promobit';
import { shopeeScraper } from './shopee';

export const scrapers: FonteScraper[] = [
  amazonScraper,
  promobitScraper,
  kabumScraper,
  asusScraper,
  magaluScraper,
  shopeeScraper,
];

