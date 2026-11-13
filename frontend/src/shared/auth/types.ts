import type { Rol } from './permisos';

export interface UsuarioSesion {
  id: number;
  correo: string;
  roles: Rol[];
  nombre: string | null;
  apellido: string | null;
}

export interface SesionCrear {
  correo: string;
  contrasena: string;
}

export interface SesionIniciada {
  token: string;
  tipo: 'bearer';
  vence_en: string;
  usuario: UsuarioSesion;
}
