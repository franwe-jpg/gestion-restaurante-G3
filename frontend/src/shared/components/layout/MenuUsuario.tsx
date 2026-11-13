import { useNavigate } from 'react-router-dom';

import type { Rol } from '../../auth/permisos';
import type { UsuarioSesion } from '../../auth/types';
import { useSesion } from '../../auth/useSesion';
import { Button } from '../ui/button';

const NOMBRE_DEL_ROL: Record<Rol, string> = {
  ENCARGADO: 'Encargado',
  MOZO: 'Mozo',
  CHEF: 'Chef',
};

function nombreVisible(usuario: UsuarioSesion): string {
  const completo = [usuario.nombre, usuario.apellido].filter(Boolean).join(' ');
  return completo === '' ? usuario.correo : completo;
}

/** Quien inicio sesion, con sus roles y el boton para cerrarla. */
export function MenuUsuario() {
  const { usuario, cerrarSesion } = useSesion();
  const navigate = useNavigate();

  if (usuario === null) return null;

  const salir = async () => {
    await cerrarSesion();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex items-center gap-3">
      <div className="hidden min-w-0 text-right leading-tight sm:block">
        <p className="truncate text-sm font-medium text-slate-800">{nombreVisible(usuario)}</p>
        <p className="truncate text-xs text-slate-500">
          {usuario.roles.map((rol) => NOMBRE_DEL_ROL[rol]).join(' · ')}
        </p>
      </div>
      <Button variant="brand-outline" size="sm" onClick={() => void salir()}>
        Cerrar sesión
      </Button>
    </div>
  );
}
