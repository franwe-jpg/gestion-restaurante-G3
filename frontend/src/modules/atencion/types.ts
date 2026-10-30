export type EstadoComanda = 'abierta' | 'en_cocina' | 'servida' | 'cerrada';

export interface Comanda {
  id: string;
  mesaId: string;
  mozoId: string;
  estado: EstadoComanda;
  itemsCount: number;
}
