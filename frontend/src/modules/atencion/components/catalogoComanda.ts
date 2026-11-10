import type { Pagina, RespuestaApi } from '../../../shared/types';
import { listarMenusEjecutivos, listarMesas, listarProductos } from '../api';
import type {
  CatalogoComanda,
  DetalleComandaCrear,
  MenuEjecutivoSeleccionable,
  MesaSeleccionable,
  NombresCatalogo,
  ProductoSeleccionable,
} from '../types';

function aNombres(
  productos: ProductoSeleccionable[],
  menus: MenuEjecutivoSeleccionable[],
): NombresCatalogo {
  const nombres: NombresCatalogo = { productos: {}, menus: {} };
  productos.forEach((p) => (nombres.productos[p.id] = p.nombre));
  menus.forEach((m) => (nombres.menus[m.id] = m.nombre));
  return nombres;
}

const SIN_MESAS: Promise<RespuestaApi<Pagina<MesaSeleccionable>>> = Promise.resolve({
  exito: true,
  datos: { items: [], total: 0, limit: 0, offset: 0 },
});

function primerError(respuestas: RespuestaApi<unknown>[]): string | null {
  const fallida = respuestas.find((r) => !r.exito || !r.datos);
  return fallida ? (fallida.error ?? 'No se pudo cargar el catálogo') : null;
}

export async function cargarCatalogo(conMesas: boolean): Promise<RespuestaApi<CatalogoComanda>> {
  const [mesas, productos, menus] = await Promise.all([
    conMesas ? listarMesas() : SIN_MESAS,
    listarProductos(),
    listarMenusEjecutivos(),
  ]);
  const error = primerError([mesas, productos, menus]);
  if (error) return { exito: false, datos: null, error };
  const todosProductos = productos.datos?.items ?? [];
  const todosMenus = menus.datos?.items ?? [];
  return {
    exito: true,
    datos: {
      mesasLibres: (mesas.datos?.items ?? []).filter((m) => m.estado === 'LIBRE'),
      productos: todosProductos.filter((p) => p.estado === 'HABILITADO'),
      menus: todosMenus.filter((m) => m.estado === 'HABILITADO'),
      nombres: aNombres(todosProductos, todosMenus),
    },
  };
}

type Referencia = Pick<DetalleComandaCrear, 'producto_id' | 'menu_ejecutivo_id'>;

export function nombreDeDetalle(nombres: NombresCatalogo, detalle: Referencia): string {
  if (detalle.producto_id !== null) {
    return nombres.productos[detalle.producto_id] ?? `Producto #${detalle.producto_id}`;
  }
  const id = detalle.menu_ejecutivo_id;
  return (id !== null && nombres.menus[id]) || `Menú #${id}`;
}

export function etiquetaMesa(mesa: MesaSeleccionable): string {
  return `Mesa ${mesa.numero} · ${mesa.sector.nombre}`;
}

export function etiquetaProducto(producto: ProductoSeleccionable): string {
  return `${producto.nombre} · $${producto.precio}`;
}

export function etiquetaMenu(menu: MenuEjecutivoSeleccionable): string {
  return `${menu.nombre} · $${menu.precio_fijo}`;
}
