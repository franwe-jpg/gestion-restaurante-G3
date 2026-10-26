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

  private async solicitar<T>(endpoint: string, init?: RequestInit): Promise<RespuestaApi<T>> {
    try {
      const respuesta = await fetch(this.url(endpoint), init);

      if (!respuesta.ok) {
        const cuerpo: unknown = await respuesta.json().catch(() => null);
        const detalle = esDetalle(cuerpo)
          ? cuerpo.detalle
          : `Error HTTP: ${respuesta.status} ${respuesta.statusText}`;
        return { datos: null, exito: false, error: detalle };
      }

      const datos = (await respuesta.json()) as T;
      return { datos, exito: true };
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
