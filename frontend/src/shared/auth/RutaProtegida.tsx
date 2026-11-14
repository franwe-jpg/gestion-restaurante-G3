import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import type { EstadoLogin } from './origen';
import { useSesion } from './useSesion';

/** Sin sesion lleva a `/login` y recuerda la ruta pedida; no se hace ninguna llamada de datos. */
export function RutaProtegida() {
  const { usuario, cargando } = useSesion();
  const location = useLocation();

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>Cargando sesión...</span>
      </div>
    );
  }
  if (usuario === null) {
    const estado: EstadoLogin = { desde: `${location.pathname}${location.search}` };
    return <Navigate to="/login" replace state={estado} />;
  }
  return <Outlet />;
}
