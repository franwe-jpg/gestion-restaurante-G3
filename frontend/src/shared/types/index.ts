export interface EstadoServicio {
  estado: string;
  mensaje?: string;
  version?: string;
}

export interface RespuestaApi<T> {
  datos: T | null;
  exito: boolean;
  error?: string;
}

export interface Pagina<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
