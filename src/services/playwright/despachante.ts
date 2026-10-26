import { Page } from 'playwright';
import { Oferta } from '../../types/oferta';
import { ResultadoVerificacao } from './types';
import { verificarPromobit } from './lojas/promobit';
import { verificarAmazon } from './lojas/amazon';
import { verificarKabum } from './lojas/kabum';
import { verificarZoomBuscape } from './lojas/zoom-buscape';
import { verificarAsus, verificarLg, verificarMagalu } from './lojas/marcas';

export async function verificarOfertaComPlaywright(
  page: Page,
  oferta: Oferta
): Promise<ResultadoVerificacao> {
  try {
    if (oferta.fonteId === 'promobit' || oferta.url.includes('promobit.com.br')) {
      return await verificarPromobit(page, oferta);
    }
    if (oferta.fonteId === 'amazon' || oferta.url.includes('amazon.com.br')) {
      return await verificarAmazon(page, oferta);
    }
    if (oferta.fonteId === 'kabum' || oferta.url.includes('kabum.com.br')) {
      return await verificarKabum(page, oferta);
    }
    if (
      oferta.fonteId === 'zoom' ||
      oferta.url.includes('zoom.com.br') ||
      oferta.fonteId === 'buscape' ||
      oferta.url.includes('buscape.com.br')
    ) {
      return await verificarZoomBuscape(page, oferta);
    }
    if (oferta.fonteId === 'asus' || oferta.url.includes('store.asus.com')) {
      return await verificarAsus(page, oferta);
    }
    if (oferta.fonteId === 'magalu' || oferta.url.includes('magazineluiza.com.br')) {
      return await verificarMagalu(page, oferta);
    }
    if (oferta.fonteId === 'lg' || oferta.url.includes('lg.com')) {
      return await verificarLg(page, oferta);
    }
    return { oferta, valida: true };
  } catch (err: any) {
    console.warn(
      `[Playwright] Erro ao verificar oferta ${oferta.url}: ${err.message}. Mantendo se não for falha crítica.`
    );
    return { oferta, valida: true };
  }
}
