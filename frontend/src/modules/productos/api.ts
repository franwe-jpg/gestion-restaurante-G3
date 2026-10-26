import { clienteHttp, urlDelBackend } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type { CategoriaAlta, CategoriaEdicion } from './categorias';
import type {
  FiltroEstado,
  ProductoCrear,
  ProductoListado,
  ProductoModificar,
  ProductoSalida,
  ProductoSeleccionable,
  Seccion,
  SeccionCrear,
  SeccionListado,
} from './types';

const LIMITE_SELECTOR = 100;

const ENDPOINTS: Record<CategoriaAlta, string> = {
  PLATO: '/platos',
  POSTRE: '/postres',
};

export function listarSecciones(
  limit: number,
  offset: number,
): Promise<RespuestaApi<Pagina<SeccionListado>>> {
  return clienteHttp.get<Pagina<SeccionListado>>(`/secciones?limit=${limit}&offset=${offset}`);
}

export function crearSeccion(datos: SeccionCrear): Promise<RespuestaApi<Seccion>> {
  return clienteHttp.post<Seccion, SeccionCrear>('/secciones', datos);
}

export function listarProductosHabilitados(): Promise<RespuestaApi<Pagina<ProductoSeleccionable>>> {
  return clienteHttp.get<Pagina<ProductoSeleccionable>>(
    `/productos?limit=${LIMITE_SELECTOR}&offset=0`,
  );
}

export function listarProductos(
  estado: FiltroEstado,
  limit: number,
  offset: number,
): Promise<RespuestaApi<Pagina<ProductoListado>>> {
  return clienteHttp.get<Pagina<ProductoListado>>(
    `/productos?estado=${estado}&limit=${limit}&offset=${offset}`,
  );
}

export function listarSeccionesHabilitadas(): Promise<RespuestaApi<Pagina<SeccionListado>>> {
  return clienteHttp.get<Pagina<SeccionListado>>(
    `/secciones?estado=HABILITADO&limit=${LIMITE_SELECTOR}&offset=0`,
  );
}

/** Una sola solicitud multipart: la parte `datos` lleva el JSON y `imagen` el archivo opcional. */
export function crearProducto(
  categoria: CategoriaAlta,
  datos: ProductoCrear,
  imagen: File | null,
): Promise<RespuestaApi<ProductoSalida>> {
  const formulario = new FormData();
  formulario.append('datos', JSON.stringify(datos));
  if (imagen) formulario.append('imagen', imagen);
  return clienteHttp.postFormulario<ProductoSalida>(ENDPOINTS[categoria], formulario);
}

export function obtenerProducto(
  categoria: CategoriaEdicion,
  id: number,
): Promise<RespuestaApi<ProductoSalida>> {
  return clienteHttp.get<ProductoSalida>(`${ENDPOINTS[categoria]}/${id}`);
}

/** Una sola solicitud multipart `PUT`: `datos` lleva el JSON e `imagen` el archivo nuevo opcional. */
export function modificarProducto(
  categoria: CategoriaEdicion,
  id: number,
  datos: ProductoModificar,
  imagen: File | null,
): Promise<RespuestaApi<ProductoSalida>> {
  const formulario = new FormData();
  formulario.append('datos', JSON.stringify(datos));
  if (imagen) formulario.append('imagen', imagen);
  return clienteHttp.putFormulario<ProductoSalida>(`${ENDPOINTS[categoria]}/${id}`, formulario);
}

export function darDeBajaProducto(
  categoria: CategoriaEdicion,
  id: number,
): Promise<RespuestaApi<ProductoSalida>> {
  return clienteHttp.post<ProductoSalida, Record<string, never>>(
    `${ENDPOINTS[categoria]}/${id}/baja`,
    {},
  );
}

/** `imagen_url` es relativa al backend; el navegador necesita la URL absoluta. */
export function urlDeImagen(imagenUrl: string | null): string | null {
  return imagenUrl === null ? null : urlDelBackend(imagenUrl);
}
