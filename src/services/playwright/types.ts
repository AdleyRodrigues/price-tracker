import { Oferta } from '../../types/oferta';

export interface ResultadoVerificacao {
  oferta: Oferta;
  valida: boolean;
  motivo?: string;
  precoConfirmado?: number;
  precoParceladoConfirmado?: number;
  detalhesParcelamentoConfirmado?: string;
  cupomTagConfirmado?: string;
  cupomDescontoConfirmado?: number;
  precoComCupomConfirmado?: number;
  freteConfirmado?: number;
}
