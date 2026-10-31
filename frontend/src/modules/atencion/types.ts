export type EstadoComanda = 'abierta' | 'en_cocina' | 'servida' | 'cerrada';

export interface Comanda {
  id: string;
  mesaId: string;
  mozoId: string;
  estado: EstadoComanda;
  itemsCount: number;
}

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
}

export interface ClienteModificar {
  nombre: string;
  telefono: string;
}

export interface PaginaCliente {
  items: Cliente[];
  total: number;
  limit: number;
  offset: number;
}
