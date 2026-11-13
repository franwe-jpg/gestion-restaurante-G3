/** Wire representations of the shared S2-01 DTOs. Money remains a decimal string. */
export type EstadoComanda = 'ABIERTA' | 'CERRADA' | 'ANULADA';
export interface ComandaResumen {
  id: number;
  mesa_id: number;
  mozo_id: number | null;
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
  mozo_id: number;
  detalles: DetalleComandaCrear[];
  observaciones: string | null;
}
export interface DetalleComandaSalida extends DetalleComandaCrear {
  id?: number | null;
  precio_unitario: string;
  descuento: string;
  promocion_id: number | null;
  estado_entrega: 'PENDIENTE' | 'ENTREGADO';
}

export interface ComandaModificar {
  agregar: DetalleComandaCrear[];
  quitar: number[];
}
/** S4-04: asignación o corrección explícita del mozo de una comanda existente. */
export interface ComandaMozoAsignar {
  mozo_id: number;
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
/** HU-M4-08: entrega por cantidad de cada línea; el estado lo deriva el servidor. */
export interface DetalleEntrega extends DetallePendiente {
  cantidad_entregada: number;
  estado_entrega: 'PENDIENTE' | 'ENTREGADO';
}
export interface EntregasComanda {
  comanda_id: number;
  estado: EstadoComanda;
  detalles: DetalleEntrega[];
}
export interface EntregaDetalle {
  cantidad_entregada: number;
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

/** Catálogo de solo lectura para los selectores de la comanda (S4-03). */
export interface MesaSeleccionable {
  id: number;
  numero: number;
  sector: { id: number; nombre: string };
  estado: 'LIBRE' | 'OCUPADA' | 'FUERA_DE_SERVICIO';
}
export interface ProductoSeleccionable {
  id: number;
  nombre: string;
  precio: string;
  estado: 'HABILITADO' | 'DESHABILITADO';
}
export interface MenuEjecutivoSeleccionable {
  id: number;
  nombre: string;
  precio_fijo: string;
  estado: 'HABILITADO' | 'DESHABILITADO';
}
export interface MozoSeleccionable {
  id: number;
  nombre: string;
  apellido: string;
  estado: 'HABILITADO' | 'DESHABILITADO';
}
export interface NombresCatalogo {
  productos: Record<number, string>;
  menus: Record<number, string>;
}
export interface CatalogoComanda {
  mesasLibres: MesaSeleccionable[];
  mozos: MozoSeleccionable[];
  productos: ProductoSeleccionable[];
  menus: MenuEjecutivoSeleccionable[];
  nombres: NombresCatalogo;
}

export type TurnoReporteComandas = 'ALMUERZO' | 'NOCHE';

export interface GrupoReporteComandas {
  fecha: string;
  turno: TurnoReporteComandas;
  cantidad_comandas: number;
  importe_total: string;
  ticket_promedio: string;
}

export interface ReporteComandasTicketPromedio {
  fecha_desde: string;
  fecha_hasta: string;
  turno: TurnoReporteComandas | null;
  grupos: GrupoReporteComandas[];
  total_comandas: number;
  importe_total: string;
  ticket_promedio: string;
}
