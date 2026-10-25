import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type { CategoriaAlta } from './categorias';
import type {
  ProductoCrear,
  ProductoSalida,
  ProductoSeleccionable,
  Seccion,
  SeccionCrear,
  SeccionListado,
} from './types';

const LIMITE_SELECTOR = 100;

const ENDPOINTS_ALTA: Record<CategoriaAlta, string> = {
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
  return clienteHttp.postFormulario<ProductoSalida>(ENDPOINTS_ALTA[categoria], formulario);
}
