import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut } from 'lucide-react';

import { useSesion } from '../../auth/useSesion';
import { DropdownMenu, type ItemMenu } from '../ui/dropdown-menu';

import { inicialesDe, NOMBRE_DEL_ROL, nombreVisible } from './usuarioVisible';

/**
 * Sesión del usuario en el navbar: avatar que abre un desplegable con el cambio
 * de rol (solo si tiene dos o más) y el cierre de sesión.
 */
export function MenuSesion() {
  const { usuario, rolActivo, fijarRolActivo, cerrarSesion } = useSesion();
  const navigate = useNavigate();

  if (usuario === null) return null;

  const salir = async () => {
    await cerrarSesion();
    navigate('/login', { replace: true });
  };

  const nombre = nombreVisible(usuario);
  const items: ItemMenu[] = [];

  if (usuario.roles.length >= 2) {
    for (const [indice, rol] of usuario.roles.entries()) {
      items.push({
        etiqueta: NOMBRE_DEL_ROL[rol],
        seleccionado: rolActivo === rol,
        separadorAntes: indice === 0,
        onSelect: () => fijarRolActivo(rol),
      });
    }
    items.push({
      etiqueta: 'Todos los roles',
      seleccionado: rolActivo === null,
      onSelect: () => fijarRolActivo(null),
    });
  }

  items.push({
    etiqueta: 'Cerrar sesión',
    icono: LogOut,
    peligro: true,
    separadorAntes: items.length > 0,
    onSelect: () => void salir(),
  });

  return (
    <DropdownMenu
      etiqueta={`Sesión de ${nombre}`}
      items={items}
      disparador={
        <>
          <span
            aria-hidden="true"
            className="bg-brand-subtle text-primary-strong flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
          >
            {inicialesDe(usuario)}
          </span>
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </>
      }
      encabezado={
        <div className="min-w-0 px-2 py-1.5">
          <p className="truncate text-sm font-medium text-slate-800">{nombre}</p>
          <p className="truncate text-xs text-slate-500">{usuario.correo}</p>
        </div>
      }
    />
  );
}
