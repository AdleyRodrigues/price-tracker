import { TAMANHO_PODIO } from '../config/regras';
import { Oferta } from '../types/oferta';

/** Custo de compra: precoComCupom é só produto; soma frete na comparação. */
export function menorCustoReal(o: Oferta): number {
  if (o.precoComCupom != null && o.precoComCupom > 0) {
    const totalComCupom = Math.round((o.precoComCupom + o.frete) * 100) / 100;
    return Math.min(o.precoTotal, totalComCupom);
  }
  return o.precoTotal;
}

export function ordenarPorTotal(ofertas: Oferta[]): Oferta[] {
  return [...ofertas].sort((a, b) => menorCustoReal(a) - menorCustoReal(b));
}

export function podio(ofertas: Oferta[], tamanho = TAMANHO_PODIO): Oferta[] {
  return ofertas.slice(0, tamanho);
}
