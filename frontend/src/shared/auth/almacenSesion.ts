import type { Rol } from './permisos';

/** El token vive en `sessionStorage`: se pierde al cerrar la pestana. */
const CLAVE_TOKEN = 'gestion-restaurante.token';
/** El rol activo es un filtro visual y muere con la sesion. */
const CLAVE_ROL = 'gestion-restaurante.rol-activo';

const ROLES_VALIDOS: readonly Rol[] = ['ENCARGADO', 'MOZO', 'CHEF'];

export function leerToken(): string | null {
  return sessionStorage.getItem(CLAVE_TOKEN);
}

export function guardarToken(token: string): void {
  sessionStorage.setItem(CLAVE_TOKEN, token);
}

export function borrarToken(): void {
  sessionStorage.removeItem(CLAVE_TOKEN);
}

export function leerRolActivo(): Rol | null {
  const valor = sessionStorage.getItem(CLAVE_ROL);
  return (ROLES_VALIDOS as readonly string[]).includes(valor ?? '') ? (valor as Rol) : null;
}

export function guardarRolActivo(rol: Rol): void {
  sessionStorage.setItem(CLAVE_ROL, rol);
}

export function borrarRolActivo(): void {
  sessionStorage.removeItem(CLAVE_ROL);
}
