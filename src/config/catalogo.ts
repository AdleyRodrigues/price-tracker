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
    loja: 'Amazon (Busca ASUS RTX 4060)',
    produto: 'Notebook ASUS RTX 4060 (16:10)',
    url: 'https://www.amazon.com.br/s?k=notebook+asus+rtx+4060',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_AMAZON,
  },
  {
    loja: 'Amazon (Busca ASUS RTX 5050)',
    produto: 'Notebook ASUS RTX 5050 (16:10)',
    url: 'https://www.amazon.com.br/s?k=notebook+asus+rtx+5050',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_AMAZON,
  },
  {
    loja: 'Amazon (Busca ASUS RTX 5060)',
    produto: 'Notebook ASUS RTX 5060 (16:10)',
    url: 'https://www.amazon.com.br/s?k=notebook+asus+rtx+5060',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_AMAZON,
  },
  {
    loja: 'Amazon (Busca ASUS 16")',
    produto: 'Notebook ASUS 16" RTX',
    url: 'https://www.amazon.com.br/s?k=notebook+asus+16',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_AMAZON,
  },
  {
    loja: 'KaBuM!',
    produto: 'Notebook ASUS Gamer V16 RP213 RTX 5050 Core 5 8GB 512GB 16" 16:10',
    url: 'https://www.kabum.com.br/produto/1056505/notebook-asus-gamer-v16-rp213-rtx-5050-core-5-8gb-ram-512gb-ssd-linux-16-lcd-led-fhd-144hz-nivel-ips',
    parser: 'kabum',
    freteFallback: 0,
  },
  {
    loja: 'Loja Oficial ASUS',
    produto: 'Notebook ASUS Gaming V16 V3607VM RP213 RTX 5050 Core 5 8GB 512GB 16" 16:10',
    url: 'https://br.store.asus.com/notebook-asus-v16-v3607vm-rp213-matte-black.html',
    parser: 'asus',
    freteFallback: 0,
  },
  {
    loja: 'Magazine Luiza',
    produto: 'Notebook ASUS Gaming V16 V3607VH RTX 5050 Core 5 16GB 512GB 16" 16:10',
    url: 'https://www.magazineluiza.com.br/notebook-asus-gaming-v16-v3607vh-nvidia-rtx-5050-intel-core-5-16gb-ram-512gb-ssd-windows-11-home-16-lcd-led-fhd-nivel-ips-rp106w/p/bg8c73ekb2/in/ntbg/?&seller_id=asus&utm_content=&partner_id=84437',
    parser: 'magalu',
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

