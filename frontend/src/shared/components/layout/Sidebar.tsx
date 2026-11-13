import { NavLink } from 'react-router-dom';
import { Activity, ChefHat, Palette } from 'lucide-react';

import { useSesion } from '../../auth/useSesion';
import { cn } from '../../lib/utils';
import { Separator } from '../ui/separator';

import { ELEMENTOS_NAVEGACION } from './navegacion';
import { inicialesDe, NOMBRE_DEL_ROL, nombreVisible } from './usuarioVisible';

export interface SidebarProps {
  colapsada?: boolean;
  alSeleccionarEnlace?: () => void;
  className?: string;
}

export function Sidebar({ colapsada = false, alSeleccionarEnlace, className }: SidebarProps) {
  const { puede, usuario, rolActivo } = useSesion();
  const elementos = ELEMENTOS_NAVEGACION.filter((item) => puede(item.permiso));

  const claseEnlace = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      isActive
        ? 'border-l-2 border-primary bg-primary-subtle font-semibold text-primary-strong'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    );

  return (
    <aside
      aria-label="Navegación principal"
      className={cn(
        'flex h-full flex-col justify-between border-r border-slate-200 bg-white text-slate-800 transition-all duration-200',
        colapsada ? 'w-16' : 'w-64',
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Marca / Logo */}
        <div className="flex h-16 shrink-0 items-center px-4">
          <NavLink
            to="/"
            onClick={alSeleccionarEnlace}
            aria-label="GastroAdmin · Ir al inicio"
            className="focus-visible:ring-primary flex items-center gap-2.5 rounded-md font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2"
          >
            <span
              aria-hidden="true"
              className="bg-brand text-brand-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            >
              <ChefHat className="h-5 w-5" aria-hidden="true" />
            </span>
            {!colapsada && (
              <span className="truncate text-base font-bold tracking-tight whitespace-nowrap text-slate-900">
                GastroAdmin
              </span>
            )}
          </NavLink>
        </div>

        <Separator />

        {/* Enlaces de Módulos */}
        <nav aria-label="Módulos del restaurante" className="min-h-0 flex-1 overflow-y-auto p-2">
          {!colapsada && (
            <p className="px-3 pt-1 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              Módulos
            </p>
          )}
          <ul className="space-y-1">
            {elementos.map((item) => {
              const Icono = item.icono;
              return (
                <li key={item.ruta}>
                  <NavLink
                    to={item.ruta}
                    onClick={alSeleccionarEnlace}
                    title={colapsada ? item.nombre : undefined}
                    aria-label={colapsada ? item.nombre : undefined}
                    className={claseEnlace}
                  >
                    <Icono
                      className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-slate-900"
                      aria-hidden="true"
                    />
                    {!colapsada && <span className="truncate">{item.nombre}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
          {!colapsada && elementos.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-500">
              No tenés módulos habilitados con tu rol actual.
            </p>
          )}
        </nav>
      </div>

      {/* Enlaces inferiores de referencia */}
      <div className="shrink-0 p-2">
        <Separator className="mb-2" />
        {!colapsada && (
          <p className="px-3 pt-1 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Ayuda
          </p>
        )}
        <ul className="space-y-1">
          <li>
            <NavLink
              to="/componentes"
              onClick={alSeleccionarEnlace}
              title={colapsada ? 'Guía de componentes' : undefined}
              aria-label={colapsada ? 'Guía de componentes' : undefined}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive
                    ? 'bg-slate-100 font-semibold text-slate-900'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
                )
              }
            >
              <Palette
                className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-slate-800"
                aria-hidden="true"
              />
              {!colapsada && <span className="truncate">Guía de componentes</span>}
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/salud"
              onClick={alSeleccionarEnlace}
              title={colapsada ? 'Estado del backend' : undefined}
              aria-label={colapsada ? 'Estado del backend' : undefined}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive
                    ? 'bg-slate-100 font-semibold text-slate-900'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
                )
              }
            >
              <Activity
                className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-slate-800"
                aria-hidden="true"
              />
              {!colapsada && <span className="truncate">Estado del backend</span>}
            </NavLink>
          </li>
        </ul>

        {usuario !== null && (
          <>
            <Separator className="my-2" />
            <div
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5"
              title={colapsada ? nombreVisible(usuario) : undefined}
            >
              <span
                aria-hidden="true"
                className="bg-brand-subtle text-primary-strong flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              >
                {inicialesDe(usuario)}
              </span>
              {!colapsada && (
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {nombreVisible(usuario)}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {rolActivo === null
                      ? usuario.roles.map((rol) => NOMBRE_DEL_ROL[rol]).join(' · ')
                      : NOMBRE_DEL_ROL[rolActivo]}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
