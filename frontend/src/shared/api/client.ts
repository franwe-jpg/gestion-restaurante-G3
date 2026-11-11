import { borrarToken, leerToken } from '../auth/almacenSesion';
import type { EstadoServicio, RespuestaApi } from '../types';

const API_PREFIX = '/api/v1';
const URL_POR_DEFECTO = 'http://127.0.0.1:8000';

function urlBase(): string {
  const configurada = import.meta.env.VITE_API_URL?.trim() || URL_POR_DEFECTO;
  return configurada.replace(/\/+$/, '');
}

function esDetalle(valor: unknown): valor is { detalle: string } {
  return typeof valor === 'object' && valor !== null && 'detalle' in valor;
}

type ManejadorSesionVencida = () => void;

let manejadorSesionVencida: ManejadorSesionVencida | null = null;

/** El proveedor de sesion registra aca que hacer cuando la API responde 401 con token. */
export function registrarSesionVencida(manejador: ManejadorSesionVencida | null): void {
  manejadorSesionVencida = manejador;
}

/** Agrega `Authorization: Bearer` solo si hay token; sin token la solicitud no cambia. */
function conAutorizacion(init?: RequestInit): RequestInit | undefined {
  const token = leerToken();
  if (token === null) {
    return init;
  }
  return { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` } };
}

export function urlDelBackend(ruta: string): string {
  return `${urlBase()}${ruta}`;
}

export class ClienteApi {
  private readonly baseUrl?: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl;
  }

  private url(endpoint: string): string {
    return `${this.baseUrl ?? urlBase()}${API_PREFIX}${endpoint}`;
  }

  private async detalleDeError(respuesta: Response): Promise<string> {
    const cuerpo: unknown = await respuesta.json().catch(() => null);
    return esDetalle(cuerpo)
      ? cuerpo.detalle
      : `Error HTTP: ${respuesta.status} ${respuesta.statusText}`;
  }

  /** Un 401 de una solicitud con token cierra la sesion; el 401 de `POST /sesion` no. */
  private alRecibir401(endpoint: string, init?: RequestInit): void {
    const esInicioDeSesion = endpoint === '/sesion' && init?.method === 'POST';
    if (esInicioDeSesion || leerToken() === null) {
      return;
    }
    borrarToken();
    manejadorSesionVencida?.();
  }

  private async solicitar<T>(endpoint: string, init?: RequestInit): Promise<RespuestaApi<T>> {
    try {
      const respuesta = await fetch(this.url(endpoint), conAutorizacion(init));

      if (respuesta.status === 401) {
        this.alRecibir401(endpoint, init);
      }

      if (!respuesta.ok) {
        return { datos: null, exito: false, error: await this.detalleDeError(respuesta) };
      }

      if (respuesta.status === 204) {
        return { datos: null, exito: true };
      }

      let datos: T;
      try {
        datos = (await respuesta.json()) as T;
      } catch {
        return { datos: null, exito: false, error: 'La respuesta del backend no es válida' };
      }
      return { datos, exito: true };
    } catch {
      return { datos: null, exito: false, error: 'No se pudo conectar con el backend' };
    }
  }

  /** Descarga un archivo binario (por ejemplo, un PDF); los errores llegan como `{"detalle"}`. */
  async obtenerArchivo(endpoint: string): Promise<RespuestaApi<Blob>> {
    try {
      const respuesta = await fetch(this.url(endpoint), conAutorizacion());

      if (respuesta.status === 401) {
        this.alRecibir401(endpoint);
      }

      if (!respuesta.ok) {
        return { datos: null, exito: false, error: await this.detalleDeError(respuesta) };
      }

      return { datos: await respuesta.blob(), exito: true };
    } catch {
      return { datos: null, exito: false, error: 'No se pudo conectar con el backend' };
    }
  }

  get<T>(endpoint: string): Promise<RespuestaApi<T>> {
    return this.solicitar<T>(endpoint);
  }

  post<T, B>(endpoint: string, body: B): Promise<RespuestaApi<T>> {
    return this.solicitar<T>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  put<T, B>(endpoint: string, body: B): Promise<RespuestaApi<T>> {
    return this.solicitar<T>(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string): Promise<RespuestaApi<T>> {
    return this.solicitar<T>(endpoint, { method: 'DELETE' });
  }

  /** Sin `Content-Type`: el navegador lo fija con el `boundary` del multipart. */
  postFormulario<T>(endpoint: string, formulario: FormData): Promise<RespuestaApi<T>> {
    return this.solicitar<T>(endpoint, { method: 'POST', body: formulario });
  }

  /** Igual que `postFormulario`, con `PUT`. */
  putFormulario<T>(endpoint: string, formulario: FormData): Promise<RespuestaApi<T>> {
    return this.solicitar<T>(endpoint, { method: 'PUT', body: formulario });
  }
}

export const clienteHttp = new ClienteApi();

export function obtenerSalud(): Promise<RespuestaApi<EstadoServicio>> {
  return clienteHttp.get<EstadoServicio>('/salud');
}
