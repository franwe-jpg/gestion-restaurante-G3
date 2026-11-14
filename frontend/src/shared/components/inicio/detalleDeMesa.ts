import type { ComandaApi, ComandaDeMesa, DetalleComandaApi, ItemConNombre } from './types';

function nombreDe(
  detalle: DetalleComandaApi,
  productos: Map<number, string>,
  menus: Map<number, string>,
): string {
  if (detalle.producto_id !== null) {
    return productos.get(detalle.producto_id) ?? `Producto n.º ${detalle.producto_id}`;
  }
  const id = detalle.menu_ejecutivo_id ?? 0;
  return menus.get(id) ?? `Menú n.º ${id}`;
}

function porId(items: ItemConNombre[]): Map<number, string> {
  return new Map(items.map((item) => [item.id, item.nombre]));
}

/**
 * Comanda abierta lista para el detalle de la mesa: nombre de cada línea (producto o menú, o
 * «Producto n.º N» si ya no figura), importe con descuento, total y unidades entregadas.
 */
export function armarComanda(
  comanda: ComandaApi,
  productos: ItemConNombre[],
  menus: ItemConNombre[],
): ComandaDeMesa {
  const nombresDeProductos = porId(productos);
  const nombresDeMenus = porId(menus);
  const lineas = comanda.detalles.map((detalle) => ({
    cantidad: detalle.cantidad,
    nombre: nombreDe(detalle, nombresDeProductos, nombresDeMenus),
    importe: Number(detalle.precio_unitario) * detalle.cantidad - Number(detalle.descuento),
    entregado: detalle.estado_entrega === 'ENTREGADO',
  }));
  return {
    id: comanda.id,
    fechaHora: comanda.fecha_hora,
    lineas,
    total: lineas.reduce((suma, linea) => suma + linea.importe, 0),
    unidades: lineas.reduce((suma, linea) => suma + linea.cantidad, 0),
    unidadesEntregadas: lineas
      .filter((linea) => linea.entregado)
      .reduce((suma, linea) => suma + linea.cantidad, 0),
  };
}

const HORA_24 = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Hora local `HH:MM` de 24 horas (como la maqueta: «20:15 h»); «-» si la fecha no es válida. */
export function horaDelDia(fechaHora: string): string {
  const fecha = new Date(fechaHora);
  return Number.isNaN(fecha.getTime()) ? '-' : HORA_24.format(fecha);
}
