/** Wire representations of the shared S2-01 DTOs. Money remains a decimal string. */
export type EstadoComanda = 'ABIERTA' | 'CERRADA' | 'ANULADA';
export interface ComandaResumen {
  id: number;
  mesa_id: number;
  estado: EstadoComanda;
  fecha_hora: string;
}
export interface DetalleComandaCrear {
  producto_id: number | null;
  menu_ejecutivo_id: number | null;
  cantidad: number;
}
export interface ComandaCrear {
  mesa_id: number;
  detalles: DetalleComandaCrear[];
  observaciones: string | null;
}
export interface DetalleComandaSalida extends DetalleComandaCrear {
  precio_unitario: string;
  descuento: string;
  promocion_id: number | null;
  estado_entrega: 'PENDIENTE' | 'ENTREGADO';
}
export interface Comanda extends ComandaResumen {
  reserva_id?: number | null;
  observaciones?: string | null;
  detalles: DetalleComandaSalida[];
}
export interface FiltroComandas {
  mesa_id?: number;
  estado?: EstadoComanda;
  limit: number;
  offset: number;
}
/** M4 A02 operation metadata; does not alter the shared detail output. */
export interface DetallePendiente extends DetalleComandaCrear {
  id: number;
}
export interface PendientesComanda {
  comanda_id: number;
  pendientes: DetallePendiente[];
}
