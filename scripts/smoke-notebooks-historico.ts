import { salvarHistoricoNotebooks } from '../src/services/historico';
import type { Oferta } from '../src/types/oferta';

async function main() {
  const ofertas: Oferta[] = [
    {
      loja: 'Amazon',
      titulo:
        'ASUS TUF Gaming F16 FX608JHI RTX 5050 Intel Core i5-14450HX 16 polegadas 16:10',
      sku: 'FX608JHI',
      precoAVista: 6999.9,
      precoTotal: 7299.9,
      frete: 0,
      url: 'https://example.com/fx608jhi',
      fonteId: 'smoke-fx608jhi',
    },
    {
      loja: 'Kabum',
      titulo: 'Notebook ASUS TUF FX608JHR RTX 5050 Core i7 16" 16:10',
      sku: 'FX608JHR',
      precoAVista: 7499,
      precoTotal: 7499,
      frete: 0,
      url: 'https://example.com/fx608jhr',
      fonteId: 'smoke-fx608jhr',
    },
    {
      loja: 'Amazon',
      titulo:
        'ASUS TUF A16 FA607NV RTX 4060 Ryzen 7 16 polegadas WUXGA 16:10',
      sku: 'B0SMOKEASIN',
      precoAVista: 5899,
      precoTotal: 5899,
      frete: 29,
      url: 'https://example.com/fa607nv',
      fonteId: 'smoke-fa607',
    },
    {
      loja: 'Pichau',
      titulo:
        'Notebook Gamer ASUS TUF F16 RTX 5050 Intel Core i5-14450HX tela 16 16:10',
      precoAVista: 6799,
      precoTotal: 6999,
      frete: 0,
      url: 'https://example.com/f16-fallback',
      fonteId: 'smoke-fallback',
    },
  ];

  const n = await salvarHistoricoNotebooks(ofertas);
  console.log(JSON.stringify({ gravados: n }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
