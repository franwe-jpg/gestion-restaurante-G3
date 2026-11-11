/** Ruta a la que vuelve la persona despues de iniciar sesion (la que abrio sin sesion). */
export interface EstadoLogin {
  desde?: string;
}

const RUTA_DE_INICIO = '/';

/** Solo acepta rutas internas: cualquier otro valor lleva al inicio. */
export function origenDeLogin(estado: unknown): string {
  const desde = (estado as EstadoLogin | null)?.desde;
  if (typeof desde === 'string' && desde.startsWith('/') && !desde.startsWith('//')) {
    return desde;
  }
  return RUTA_DE_INICIO;
}
