import { TAMANHO_PODIO } from '../config/regras';
import { Oferta } from '../types/oferta';

export function menorCustoReal(o: Oferta): number {
  return o.precoComCupom && o.precoComCupom > 0 ? Math.min(o.precoTotal, o.precoComCupom) : o.precoTotal;
}

export function ordenarPorTotal(ofertas: Oferta[]): Oferta[] {
  return [...ofertas].sort((a, b) => menorCustoReal(a) - menorCustoReal(b));
}

export function podio(ofertas: Oferta[], tamanho = TAMANHO_PODIO): Oferta[] {
  return ofertas.slice(0, tamanho);
}
