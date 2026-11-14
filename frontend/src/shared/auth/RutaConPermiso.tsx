import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import type { Permiso } from './permisos';
import { useSesion } from './useSesion';

export interface RutaConPermisoProps {
  permiso: Permiso;
  children: ReactNode;
}

/** Quien abre por URL una pantalla que su rol no ve va al inicio (sin pantalla de acceso denegado). */
export function RutaConPermiso({ permiso, children }: RutaConPermisoProps) {
  const { puede } = useSesion();

  if (!puede(permiso)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
