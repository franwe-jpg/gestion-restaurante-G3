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

export type EstadoFactura = 'ADEUDADA' | 'PAGADA';

// Los importes llegan como cadenas con 2 decimales ("7101.00").
export interface DetalleFactura {
  producto_id: number | null;
  menu_ejecutivo_id: number | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: string;
  descuento: string;
  subtotal: string;
}

// HU-M6-01: vista previa de la factura de una comanda cerrada; no guarda nada.
export interface FacturaPrevia {
  comanda_id: number;
  fecha_emision: string;
  total: string;
  detalles: DetalleFactura[];
}

export interface Cobro {
  id: number;
  numero_comprobante: number | null;
  monto: string;
  fecha_hora: string;
  medio_pago_id: number;
}

export interface Factura {
  id: number;
  comanda_id: number;
  fecha_emision: string;
  total: string;
  saldo_pendiente: string;
  estado: EstadoFactura;
  detalles: DetalleFactura[];
  cobros: Cobro[];
}

// HU-M6-01: la factura se genera junto con su primer cobro.
export interface FacturaCrear {
  comanda_id: number;
  cobro: { medio_pago_id: number; monto: string };
}
