// Tipos mínimos de lo que consume la página de inicio. Se duplican a propósito: lo compartido no
// importa de `modules/` (D-15). Los nombres de campo son los del backend.

export type EstadoMesa = 'LIBRE' | 'OCUPADA' | 'FUERA_DE_SERVICIO';

/** Estado que se muestra: una mesa LIBRE con reserva activa hoy figura como RESERVADA. */
export type EstadoVisibleMesa = EstadoMesa | 'RESERVADA';

export interface MesaApi {
  id: number;
  numero: number;
  capacidad: number;
  sector: { id: number; nombre: string };
  estado: EstadoMesa;
}

/** `ReservaSalida` de M5 (solo lo que se usa). */
export interface ReservaActiva {
  id: number;
  mesa_id: number;
  cliente_id: number;
  hora: string; // HH:MM
  cantidad_personas: number;
}

export interface MesaDelMapa extends MesaApi {
  estadoVisible: EstadoVisibleMesa;
  /** Hora de la reserva activa más temprana del día; solo si la mesa figura RESERVADA. */
  horaReserva?: string;
  /** Esa misma reserva, para el detalle de la mesa. */
  reserva?: ReservaActiva;
}

export interface SectorDelMapa {
  id: number;
  nombre: string;
  mesas: MesaDelMapa[];
}

/** Forma del dibujo de la mesa en el plano, según su capacidad (como la maqueta: t2, t4, t6, t8). */
export type FormaMesa = 'redonda' | 'cuadrada' | 'rectangular' | 'larga';

export interface FormaDeMesa {
  forma: FormaMesa;
  sillas: 2 | 4 | 6 | 8;
}

/** Centro de la mesa en el plano, en px. */
export interface PosicionEnPlano {
  mesa: MesaDelMapa;
  x: number;
  y: number;
}

export interface GrillaDeMesas {
  columnas: number;
  filas: number;
  alto: number;
  posiciones: PosicionEnPlano[];
}

export interface Punto {
  x: number;
  y: number;
}

export interface Segmento {
  desde: Punto;
  hasta: Punto;
}

export interface Rect {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Salón principal (con cocina, barra y entrada), sala cerrada o terraza con baranda curva. */
export type TipoAmbiente = 'salon' | 'sala' | 'terraza';

export interface SectorConTipo extends SectorDelMapa {
  tipo: TipoAmbiente;
}

/** Hueco en una pared, medido desde su comienzo: puerta (con hoja), ventana o paso libre. */
export interface Abertura {
  centro: number;
  ancho: number;
  tipo: 'puerta' | 'ventana' | 'paso';
}

export interface Puerta {
  hoja: Segmento;
  /** Arco de giro de la hoja, como `d` de un `path` SVG. */
  arco: string;
}

export interface TramosDePared {
  paredes: Segmento[];
  puertas: Puerta[];
  ventanas: Segmento[];
}

export interface Bloque extends Rect {
  tipo: 'cocina' | 'barra';
  nombre: string;
}

/** Un sector dibujado como ambiente del plano. Todo en px del plano. */
export interface Ambiente {
  sector: SectorConTipo;
  paredes: Segmento[];
  paredesInteriores: Segmento[];
  /** Contorno de la baranda (solo terraza), como `d` de un `path` SVG. */
  baranda: string | null;
  puertas: Puerta[];
  ventanas: Segmento[];
  bloques: Bloque[];
  /** Dónde va el cartel «Entrada» (solo salón). */
  entrada: Punto | null;
  etiqueta: Punto;
  /** Piso del ambiente (relleno gris), como `d` de un `path` SVG. */
  piso: string;
  /** Caja que ocupa el ambiente, curva incluida. */
  limites: Rect;
  area: Rect;
  mesas: PosicionEnPlano[];
  tipo: TipoAmbiente;
}

export interface PlanoGenerado {
  ancho: number;
  alto: number;
  ambientes: Ambiente[];
}

export interface MapaDelLocalDatos {
  mesas: MesaDelMapa[];
}

/** «Libres» incluye las libres con reserva. */
export interface CantidadesPorEstado {
  libres: number;
  conReserva: number;
  ocupadas: number;
  fueraDeServicio: number;
}

export type FiltroEstado = 'TODAS' | 'LIBRES' | 'CON_RESERVA' | 'OCUPADAS' | 'FUERA_DE_SERVICIO';

export interface FiltroDelMapa {
  estado: FiltroEstado;
  sectorId: number | null;
}

/** `ComandaSalida` de M4 (solo lo que se usa). */
export interface DetalleComandaApi {
  producto_id: number | null;
  menu_ejecutivo_id: number | null;
  cantidad: number;
  precio_unitario: string;
  descuento: string;
  estado_entrega: 'PENDIENTE' | 'ENTREGADO';
}

export interface ComandaApi {
  id: number;
  mesa_id: number;
  estado: 'ABIERTA' | 'CERRADA' | 'ANULADA';
  fecha_hora: string;
  detalles: DetalleComandaApi[];
}

/** Producto (M1) o menú ejecutivo (M2): solo el nombre. */
export interface ItemConNombre {
  id: number;
  nombre: string;
}

/** `ClienteSalida` de M4. */
export interface ClienteApi {
  id: number;
  nombre: string;
  telefono: string;
}

export interface LineaDeComanda {
  cantidad: number;
  nombre: string;
  /** `precio_unitario × cantidad − descuento`. */
  importe: number;
  entregado: boolean;
}

/** Comanda abierta de una mesa, lista para el detalle. */
export interface ComandaDeMesa {
  id: number;
  fechaHora: string;
  lineas: LineaDeComanda[];
  total: number;
  unidades: number;
  unidadesEntregadas: number;
}

export interface CobradoPorMedio {
  medio_pago_id: number;
  nombre: string;
  tipo: string;
  cantidad_cobros: number;
  monto: string;
}

export interface CajaDelDia {
  fecha: string;
  por_medio_pago: CobradoPorMedio[];
  total_cobrado: string;
  adeudado: { cantidad_facturas: number; monto: string };
}
