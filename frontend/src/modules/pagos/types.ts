// Tipos de la API de pagos. Los nombres de campo son los del backend.

export type Estado = 'HABILITADO' | 'DESHABILITADO';

export type TipoMedioPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'BILLETERA_VIRTUAL';

export interface MedioPago {
  id: number;
  nombre: string;
  tipo: TipoMedioPago;
  descripcion: string | null;
  estado: Estado;
}

// HU-M6-04: alta. El estado no se envía: el sistema lo fija en HABILITADO.
export interface MedioPagoCrear {
  nombre: string;
  tipo: TipoMedioPago;
  descripcion?: string | null;
}

// HU-M6-05: modificación. Reemplazo completo, incluido el estado.
export interface MedioPagoModificar extends MedioPagoCrear {
  estado: Estado;
}
