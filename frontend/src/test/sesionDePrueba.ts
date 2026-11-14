import { permisosDe, type Rol } from '../shared/auth/permisos';
import type { SesionContexto } from '../shared/auth/sesion-context';
import type { UsuarioSesion } from '../shared/auth/types';

/** Sesion falsa para pruebas: el `setup.ts` la entrega en lugar del `useSesion` real. */
export function sesionDePrueba(
  roles: Rol[] = ['ENCARGADO'],
  cambios: Partial<SesionContexto> = {},
): SesionContexto {
  const usuario: UsuarioSesion = {
    id: 1,
    correo: 'prueba@resto.com',
    roles,
    nombre: null,
    apellido: null,
  };
  const rolActivo = cambios.rolActivo ?? null;
  const permisos = permisosDe(rolActivo === null ? roles : [rolActivo]);
  return {
    usuario,
    cargando: false,
    iniciarSesion: () => Promise.resolve({ exito: true }),
    cerrarSesion: () => Promise.resolve(),
    puede: (permiso) => permisos.has(permiso),
    rolActivo,
    fijarRolActivo: () => undefined,
    ...cambios,
  };
}

let sesion: SesionContexto = sesionDePrueba();

export function sesionActual(): SesionContexto {
  return sesion;
}

/** Cambia el rol de la sesion falsa; se restablece a encargado despues de cada prueba. */
export function usarRoles(roles: Rol[], cambios: Partial<SesionContexto> = {}): void {
  sesion = sesionDePrueba(roles, cambios);
}

/** Simula que no hay sesion (usuario nulo y sin permisos). */
export function sinSesion(cambios: Partial<SesionContexto> = {}): void {
  sesion = sesionDePrueba([], { usuario: null, ...cambios });
}

export function restablecerSesion(): void {
  sesion = sesionDePrueba();
}
