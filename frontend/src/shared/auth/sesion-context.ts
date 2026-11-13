import { createContext } from 'react';

import type { Permiso, Rol } from './permisos';
import type { UsuarioSesion } from './types';

export interface ResultadoInicio {
  exito: boolean;
  error?: string;
}

export interface SesionContexto {
  usuario: UsuarioSesion | null;
  /** Verdadero mientras se restaura la sesion con `GET /sesion`. */
  cargando: boolean;
  iniciarSesion: (correo: string, contrasena: string) => Promise<ResultadoInicio>;
  cerrarSesion: () => Promise<void>;
  puede: (permiso: Permiso) => boolean;
  /**
   * Rol elegido para filtrar el menu y las rutas visibles. Es solo un filtro local:
   * el backend sigue autorizando por todos los roles del usuario. `null` muestra todo.
   */
  rolActivo: Rol | null;
  fijarRolActivo: (rol: Rol | null) => void;
}

export const SesionContext = createContext<SesionContexto | null>(null);
