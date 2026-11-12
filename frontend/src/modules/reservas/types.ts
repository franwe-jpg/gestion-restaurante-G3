export type EstadoReserva =
  'ACTIVA' | 'ATENDIDA' | 'CANCELADA_ANTICIPADA' | 'CANCELADA_POR_AUSENCIA';
export type FiltroEstadoReserva = EstadoReserva | 'TODAS';

export interface Reserva {
  id: number;
  mesa_id: number;
  cliente_id: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  cantidad_personas: number;
  estado: EstadoReserva;
}

/** Cliente que se registra junto con la reserva (S40): solo nombre y teléfono. */
export interface ClienteNuevo {
  nombre: string;
  telefono: string;
}

/** Cliente registrado que devuelve `GET /clientes`; propio de `reservas` (AGENTS.md §9.4). */
export interface ClienteEncontrado {
  id: number;
  nombre: string;
  telefono: string;
}

interface DatosDelAlta {
  mesa_id: number;
  fecha: string;
  hora: string;
  cantidad_personas: number;
}

/** Exactamente un cliente: uno registrado o uno nuevo, nunca los dos (S39). */
export type ReservaCrear = DatosDelAlta &
  ({ cliente_id: number } | { cliente_nuevo: ClienteNuevo });
export type ReservaModificar = Pick<Reserva, 'fecha' | 'hora' | 'cantidad_personas'>;

/** Línea del pedido desde una reserva: solo productos, por su `id` (HU-M5-06, S58). */
export interface LineaComandaDesdeReserva {
  producto_id: number;
  cantidad: number;
}

/** Mozo de M3 disponible para asignar al abrir una comanda desde la reserva. */
export interface MozoSeleccionable {
  id: number;
  nombre: string;
  apellido: string;
  estado: 'HABILITADO' | 'DESHABILITADO';
}

/** Cuerpo de `POST /reservas/{id}/comanda`: Mozo elegido y sin mesa, porque sale de la reserva. */
export interface ComandaDesdeReservaCrear {
  mozo_id: number;
  detalles: LineaComandaDesdeReserva[];
  /** La API la admite; la pantalla no la pide (S64). */
  observaciones?: string;
}

/** Lo que la pantalla lee de la comanda creada; propio de `reservas` (AGENTS.md §9.4). */
export interface ComandaCreada {
  id: number;
  mesa_id: number;
  reserva_id: number | null;
  estado: string;
}

/**
 * Producto habilitado que ofrece el desplegable de la comanda, tal como lo devuelve `GET /productos`
 * (solo los campos que usa la pantalla); propio de `reservas` (AGENTS.md §9.4).
 */
export interface ProductoHabilitado {
  id: number;
  nombre: string;
  /** Texto decimal con punto y 2 decimales ("1500.50"); se convierte solo para mostrarlo. */
  precio: string;
}

/** Propios de `reservas`: no se importan del módulo `salon` (AGENTS.md §9.4, S34). */
export interface SectorResumenMesa {
  id: number;
  nombre: string;
}

/** Una mesa libre para una fecha y hora, tal como la devuelve `GET /reservas/mesas-disponibles`. */
export interface MesaDisponible {
  id: number;
  numero: number;
  capacidad: number;
  sector: SectorResumenMesa;
}

/** Reporte de reservas y ausentismo (HU-M5-07). Nombres de campo del backend. */
export interface ResumenReservas {
  fecha_desde: string; // YYYY-MM-DD
  fecha_hasta: string; // YYYY-MM-DD
  total_reservas: number;
  atendidas: number;
  canceladas_anticipada: number;
  canceladas_por_ausencia: number;
  /** Texto decimal con punto y 2 decimales ("33.33"); `null` cuando `total_reservas` es 0. */
  porcentaje_ausentismo: string | null;
}
