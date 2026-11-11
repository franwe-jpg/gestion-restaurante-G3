/** El token vive en `sessionStorage`: se pierde al cerrar la pestana. */
const CLAVE_TOKEN = 'gestion-restaurante.token';

export function leerToken(): string | null {
  return sessionStorage.getItem(CLAVE_TOKEN);
}

export function guardarToken(token: string): void {
  sessionStorage.setItem(CLAVE_TOKEN, token);
}

export function borrarToken(): void {
  sessionStorage.removeItem(CLAVE_TOKEN);
}
