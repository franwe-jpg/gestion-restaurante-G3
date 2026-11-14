import type { Rol } from '../../auth/permisos';
import type { UsuarioSesion } from '../../auth/types';

export const NOMBRE_DEL_ROL: Record<Rol, string> = {
  ENCARGADO: 'Encargado',
  MOZO: 'Mozo',
  CHEF: 'Chef',
};

/** Nombre y apellido; si faltan, el correo como alternativa. */
export function nombreVisible(usuario: UsuarioSesion): string {
  const completo = [usuario.nombre, usuario.apellido].filter(Boolean).join(' ');
  return completo === '' ? usuario.correo : completo;
}

/** Iniciales para el avatar (nombre y apellido, o primera letra del correo). */
export function inicialesDe(usuario: UsuarioSesion): string {
  const partes = [usuario.nombre, usuario.apellido].filter(Boolean) as string[];
  if (partes.length > 0) {
    return partes
      .map((parte) => parte.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  return usuario.correo.charAt(0).toUpperCase();
}
