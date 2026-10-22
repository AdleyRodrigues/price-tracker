import {
  PRECO_MINIMO_CELULAR,
  TITULO_BLOQUEADO_CELULAR,
  VALIDA_MARCA_XIAOMI,
  VALIDA_MODELO_CELULAR,
} from '../config/regras-celular';
import { Oferta, OfertaBruta } from '../types/oferta';

export function tituloBloqueadoCelular(titulo: string): boolean {
  if (TITULO_BLOQUEADO_CELULAR.test(titulo)) return true;
  if (!VALIDA_MARCA_XIAOMI.test(titulo)) return true;
  if (!VALIDA_MODELO_CELULAR.test(titulo)) return true;
  return false;
}

export function validarTituloCelular(titulo: string): boolean {
  return (
    VALIDA_MARCA_XIAOMI.test(titulo) &&
    VALIDA_MODELO_CELULAR.test(titulo) &&
    !TITULO_BLOQUEADO_CELULAR.test(titulo)
  );
}

export function ofertaBrutaValidaCelular(o: OfertaBruta): boolean {
  if (o.precoAVista < PRECO_MINIMO_CELULAR) {
    return false;
  }
  if (!validarTituloCelular(o.titulo)) {
    return false;
  }
  return true;
}

export function aceitarOfertaCelular(o: Oferta): boolean {
  if (o.precoAVista < PRECO_MINIMO_CELULAR) return false;
  if (tituloBloqueadoCelular(o.titulo)) return false;
  return Boolean(o.url && o.url.trim().length > 0);
}
