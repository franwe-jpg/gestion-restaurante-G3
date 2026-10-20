export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'otro';

export interface ComprobantePago {
  id: string;
  comandaId: string;
  total: number;
  metodo: MetodoPago;
  emitidoEn: string;
}
