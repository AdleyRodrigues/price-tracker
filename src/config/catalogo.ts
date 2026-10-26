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
    loja: 'Amazon (Busca ASUS TUF RTX 4060)',
    produto: 'Notebook ASUS TUF RTX 4060 (16:10)',
    url: 'https://www.amazon.com.br/s?k=notebook+asus+tuf+rtx+4060',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_AMAZON,
  },
  {
    loja: 'Amazon (Busca ASUS TUF RTX 5050)',
    produto: 'Notebook ASUS TUF RTX 5050 (16:10)',
    url: 'https://www.amazon.com.br/s?k=notebook+asus+tuf+rtx+5050',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_AMAZON,
  },
  {
    loja: 'Amazon (Busca ASUS TUF RTX 5060)',
    produto: 'Notebook ASUS TUF RTX 5060 (16:10)',
    url: 'https://www.amazon.com.br/s?k=notebook+asus+tuf+rtx+5060',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_AMAZON,
  },
  {
    loja: 'Amazon (Busca ASUS TUF 16")',
    produto: 'Notebook ASUS TUF 16" RTX',
    url: 'https://www.amazon.com.br/s?k=notebook+asus+tuf+16',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_AMAZON,
  },
  {
    loja: 'Loja Oficial ASUS',
    produto: 'Notebook ASUS TUF Gaming F16 FX608JHI RTX 5050 i5 16GB 512GB 16" 16:10',
    url: 'https://br.store.asus.com/notebook-asus-tuf-gaming-f16-fx608jhi-tu292-jaeger-gray.html',
    parser: 'asus',
    freteFallback: 0,
  },
  {
    loja: 'KaBuM!',
    produto: 'Notebook ASUS TUF Gaming F16 FX608JHR RTX 5050 i5 16GB 512GB 16" 16:10',
    url: 'https://www.kabum.com.br/produto/1008856/notebook-asus-tuf-gaming-f16-fx608jhr-nvidia-rtx-5050-intel-core-i5-14a-16gb-ram-512gb-ssd-windows-11-home-tela-16-led-fhd-165hz-gray-rv122w',
    parser: 'kabum',
    freteFallback: 0,
  },
  {
    loja: 'Shopee (Loja ASUS)',
    produto: 'Notebook ASUS TUF Gaming F16 RTX 5060 i5 16GB 512GB 16" 16:10',
    url: 'https://shopee.com.br/product/1644527155/58213003561?d_id=adea9&uls_trackid=56q830vj00jp',
    parser: 'shopee',
    freteFallback: 0,
  },
];
