import { createContext } from 'react';

import type { Permiso } from './permisos';
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
}

export const SesionContext = createContext<SesionContexto | null>(null);
