import { NavLink } from 'react-router-dom';
import { Activity, ChefHat, Palette } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Separator } from '../ui/separator';

import { ELEMENTOS_NAVEGACION } from './navegacion';

export interface SidebarProps {
  colapsada?: boolean;
  alSeleccionarEnlace?: () => void;
  className?: string;
}

export function Sidebar({ colapsada = false, alSeleccionarEnlace, className }: SidebarProps) {
  return (
    <aside
      aria-label="Navegación principal"
      className={cn(
        'flex h-full flex-col justify-between border-r border-slate-200 bg-white text-slate-800 transition-all duration-200',
        colapsada ? 'w-16' : 'w-64',
        className,
      )}
    >
      <div>
        {/* Marca / Logo */}
        <div className="flex h-16 items-center px-4">
          <NavLink
            to="/"
            onClick={alSeleccionarEnlace}
            className="flex items-center gap-2.5 font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded-md"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-700 text-white">
              <ChefHat className="h-5 w-5" aria-hidden="true" />
            </div>
            {!colapsada && (
              <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                GastroAdmin
              </span>
            )}
          </NavLink>
        </div>

        <Separator />

        {/* Enlaces de Módulos */}
        <nav className="space-y-1 p-2" aria-label="Módulos del restaurante">
          {ELEMENTOS_NAVEGACION.map((item) => {
            const Icono = item.icono;
            return (
              <NavLink
                key={item.ruta}
                to={item.ruta}
                onClick={alSeleccionarEnlace}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600',
                    isActive
                      ? 'bg-amber-50 text-amber-900 font-semibold border-l-2 border-amber-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                <Icono className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-slate-900" />
                {!colapsada && <span className="truncate">{item.nombre}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Enlaces inferiores de referencia */}
      <div className="p-2">
        <Separator className="mb-2" />
        <NavLink
          to="/componentes"
          onClick={alSeleccionarEnlace}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600',
              isActive
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
            )
          }
        >
          <Palette className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-slate-800" />
          {!colapsada && <span className="truncate">Guía de componentes</span>}
        </NavLink>
        <NavLink
          to="/salud"
          onClick={alSeleccionarEnlace}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600',
              isActive
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
            )
          }
        >
          <Activity className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-slate-800" />
          {!colapsada && <span className="truncate">Estado del backend</span>}
        </NavLink>
      </div>
    </aside>
  );
}
