import {
  PRECO_MINIMO_CELULAR,
  TITULO_BLOQUEADO_CELULAR,
  VALIDA_MARCA_XIAOMI,
  VALIDA_MODELO_CELULAR,
} from '../config/regras-celular';
import { Oferta, OfertaBruta } from '../types/oferta';

export function modeloEstritoCelular(titulo: string): boolean {
  if (!VALIDA_MODELO_CELULAR.test(titulo)) return false;
  // Se for da linha X8, DEVE obrigatoriamente conter 'max'
  if (/x8/i.test(titulo) && !/\bmax\b/i.test(titulo)) {
    return false;
  }
  // Se for da linha 17T ou 15T, DEVE conter 'pro'
  if (/(?:17t|15t)/i.test(titulo) && !/\bpro\b/i.test(titulo)) {
    return false;
  }
  return true;
}

export function tituloBloqueadoCelular(titulo: string): boolean {
  if (TITULO_BLOQUEADO_CELULAR.test(titulo)) return true;
  if (!VALIDA_MARCA_XIAOMI.test(titulo)) return true;
  if (!modeloEstritoCelular(titulo)) return true;
  return false;
}

export function validarTituloCelular(titulo: string): boolean {
  return (
    VALIDA_MARCA_XIAOMI.test(titulo) &&
    modeloEstritoCelular(titulo) &&
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

export type CategoriaCelular = 'poco_x8_pro_max' | 'xiaomi_linha_t';

export function identificarCategoriaCelular(titulo: string): CategoriaCelular | null {
  if (/(?:\bpoco\s*x8\s*pro\s*max\b|\bx8\s*pro\s*max\b)/i.test(titulo)) {
    return 'poco_x8_pro_max';
  }
  if (/(?:\b17t\s*pro\b|\b15t\s*pro\b)/i.test(titulo)) {
    return 'xiaomi_linha_t';
  }
  return null;
}

export function separarOfertasCelular(ofertas: Oferta[]): {
  poco: Oferta[];
  xiaomi: Oferta[];
} {
  const poco: Oferta[] = [];
  const xiaomi: Oferta[] = [];

  for (const o of ofertas) {
    const cat = identificarCategoriaCelular(o.titulo);
    if (cat === 'poco_x8_pro_max') {
      poco.push(o);
    } else if (cat === 'xiaomi_linha_t') {
      xiaomi.push(o);
    }
  }

  return { poco, xiaomi };
}
