import { FRETE_FALLBACK_AMAZON } from './regras';

export interface ItemCatalogo {
  loja: string;
  produto: string;
  url: string;
  parser: 'amazon' | 'promobit' | string;
  sku?: string;
  freteFallback?: number;
}

export const CATALOGO: ItemCatalogo[] = [
  {
    loja: 'Amazon (Busca ASUS TUF 4060)',
    produto: 'Notebook ASUS TUF RTX 4060',
    url: 'https://www.amazon.com.br/s?k=notebook+asus+tuf+rtx+4060',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_AMAZON,
  },
  {
    loja: 'Amazon (Busca ASUS TUF 5050)',
    produto: 'Notebook ASUS TUF RTX 5050',
    url: 'https://www.amazon.com.br/s?k=notebook+asus+tuf+rtx+5050',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_AMAZON,
  },
  {
    loja: 'Amazon (Busca ASUS TUF 5060)',
    produto: 'Notebook ASUS TUF RTX 5060',
    url: 'https://www.amazon.com.br/s?k=notebook+asus+tuf+rtx+5060',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_AMAZON,
  },
];

