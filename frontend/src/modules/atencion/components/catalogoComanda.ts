import type { Pagina, RespuestaApi } from '../../../shared/types';
import {
  listarMenusEjecutivos,
  listarMesas,
  listarMozosHabilitados,
  listarTodosMozos,
  listarProductos,
} from '../api';
import type {
  CatalogoComanda,
  DetalleComandaCrear,
  MenuEjecutivoSeleccionable,
  MesaSeleccionable,
  MozoSeleccionable,
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
const SIN_PRODUCTOS: Promise<RespuestaApi<Pagina<ProductoSeleccionable>>> = Promise.resolve({
  exito: true,
  datos: { items: [], total: 0, limit: 0, offset: 0 },
});
const SIN_MENUS: Promise<RespuestaApi<Pagina<MenuEjecutivoSeleccionable>>> = Promise.resolve({
  exito: true,
  datos: { items: [], total: 0, limit: 0, offset: 0 },
});
const SIN_MOZOS: Promise<RespuestaApi<MozoSeleccionable[]>> = Promise.resolve({
  exito: true,
  datos: [],
});

type RespuestasCatalogo = [
  RespuestaApi<Pagina<MesaSeleccionable>>,
  RespuestaApi<Pagina<ProductoSeleccionable>>,
  RespuestaApi<Pagina<MenuEjecutivoSeleccionable>>,
  RespuestaApi<MozoSeleccionable[]>,
];

function primerError(respuestas: RespuestaApi<unknown>[]): string | null {
  const fallida = respuestas.find((r) => !r.exito || !r.datos);
  return fallida ? (fallida.error ?? 'No se pudo cargar el catálogo') : null;
}

export async function cargarCatalogo(
  conMesas: boolean,
  conMozos = false,
  soloMozos = false,
  incluirMozosDeshabilitados = false,
): Promise<RespuestaApi<CatalogoComanda>> {
  const respuestas = await consultarCatalogos(
    conMesas,
    conMozos,
    soloMozos,
    incluirMozosDeshabilitados,
  );
  return construirCatalogo(respuestas, incluirMozosDeshabilitados);
}

async function consultarCatalogos(
  conMesas: boolean,
  conMozos: boolean,
  soloMozos: boolean,
  incluirMozosDeshabilitados: boolean,
): Promise<RespuestasCatalogo> {
  return Promise.all([
    conMesas && !soloMozos ? listarMesas() : SIN_MESAS,
    soloMozos ? SIN_PRODUCTOS : listarProductos(),
    soloMozos ? SIN_MENUS : listarMenusEjecutivos(),
    conMozos
      ? incluirMozosDeshabilitados
        ? listarTodosMozos()
        : listarMozosHabilitados()
      : SIN_MOZOS,
  ]);
}

function construirCatalogo(
  respuestas: RespuestasCatalogo,
  incluirMozosDeshabilitados: boolean,
): RespuestaApi<CatalogoComanda> {
  const [mesas, productos, menus, mozos] = respuestas;
  const error = primerError([mesas, productos, menus, mozos]);
  if (error) return { exito: false, datos: null, error };
  const todosProductos = productos.datos?.items ?? [];
  const todosMenus = menus.datos?.items ?? [];
  return {
    exito: true,
    datos: crearDatosCatalogo(
      mesas,
      todosProductos,
      todosMenus,
      mozos.datos ?? [],
      incluirMozosDeshabilitados,
    ),
  };
}

function crearDatosCatalogo(
  mesas: RespuestaApi<Pagina<MesaSeleccionable>>,
  todosProductos: ProductoSeleccionable[],
  todosMenus: MenuEjecutivoSeleccionable[],
  todosMozos: MozoSeleccionable[],
  incluirMozosDeshabilitados: boolean,
): CatalogoComanda {
  return {
    mesasLibres: (mesas.datos?.items ?? []).filter((mesa) => mesa.estado === 'LIBRE'),
    mozos: incluirMozosDeshabilitados
      ? todosMozos
      : todosMozos.filter((mozo) => mozo.estado === 'HABILITADO'),
    productos: todosProductos.filter((producto) => producto.estado === 'HABILITADO'),
    menus: todosMenus.filter((menu) => menu.estado === 'HABILITADO'),
    nombres: aNombres(todosProductos, todosMenus),
  };
}

export function buscarMozos(mozos: MozoSeleccionable[], busqueda: string): MozoSeleccionable[] {
  const termino = busqueda.trim().toLocaleLowerCase();
  return mozos.filter((mozo) => {
    if (mozo.estado !== 'HABILITADO') return false;
    return `${mozo.nombre} ${mozo.apellido}`.toLocaleLowerCase().includes(termino);
  });
}

export function etiquetaMozo(mozo: MozoSeleccionable): string {
  return `${mozo.nombre} ${mozo.apellido}`;
}

export function nombreDeMozo(mozos: MozoSeleccionable[], mozoId: number | null): string {
  if (mozoId === null) return 'Sin mozo asignado';
  const mozo = mozos.find((actual) => actual.id === mozoId);
  return mozo ? `${mozo.nombre} ${mozo.apellido}` : `Mozo #${mozoId}`;
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
