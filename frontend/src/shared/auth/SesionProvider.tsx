import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { registrarSesionVencida } from '../api/client';

import {
  borrarRolActivo,
  borrarToken,
  guardarRolActivo,
  guardarToken,
  leerRolActivo,
  leerToken,
} from './almacenSesion';
import {
  cerrarSesion as cerrarSesionApi,
  iniciarSesion as iniciarSesionApi,
  obtenerSesion,
} from './api';
import { permisosDe, type Permiso, type Rol } from './permisos';
import { SesionContext, type ResultadoInicio, type SesionContexto } from './sesion-context';
import type { UsuarioSesion } from './types';

export interface SesionProviderProps {
  children: ReactNode;
}

export function SesionProvider({ children }: SesionProviderProps) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState<boolean>(() => leerToken() !== null);
  const [rolActivo, setRolActivo] = useState<Rol | null>(() => leerRolActivo());

  useEffect(() => {
    registrarSesionVencida(() => setUsuario(null));
    return () => registrarSesionVencida(null);
  }, []);

  useEffect(() => {
    if (leerToken() === null) {
      return;
    }
    let activo = true;
    void obtenerSesion().then((respuesta) => {
      if (!activo) return;
      setUsuario(respuesta.exito ? respuesta.datos : null);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, []);

  const iniciarSesion = useCallback(
    async (correo: string, contrasena: string): Promise<ResultadoInicio> => {
      const respuesta = await iniciarSesionApi({ correo, contrasena });
      if (!respuesta.exito || respuesta.datos === null) {
        return { exito: false, error: respuesta.error };
      }
      guardarToken(respuesta.datos.token);
      setUsuario(respuesta.datos.usuario);
      borrarRolActivo();
      setRolActivo(null);
      return { exito: true };
    },
    [],
  );

  const cerrarSesion = useCallback(async (): Promise<void> => {
    await cerrarSesionApi();
    borrarToken();
    borrarRolActivo();
    setUsuario(null);
    setRolActivo(null);
  }, []);

  const fijarRolActivo = useCallback((rol: Rol | null) => {
    setRolActivo(rol);
    if (rol === null) {
      borrarRolActivo();
    } else {
      guardarRolActivo(rol);
    }
  }, []);

  const valor = useMemo<SesionContexto>(() => {
    const activo =
      usuario !== null && rolActivo !== null && usuario.roles.includes(rolActivo)
        ? rolActivo
        : null;
    const permisos = permisosDe(activo === null ? (usuario?.roles ?? []) : [activo]);
    return {
      usuario,
      cargando,
      iniciarSesion,
      cerrarSesion,
      puede: (permiso: Permiso) => permisos.has(permiso),
      rolActivo: activo,
      fijarRolActivo,
    };
  }, [usuario, cargando, iniciarSesion, cerrarSesion, rolActivo, fijarRolActivo]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}
