import type { ReactNode } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { Badge } from '../ui/badge';

export interface NavbarProps {
  titulo?: string;
  alAlternarMenuMovil: () => void;
  alAlternarColapsoEscritorio?: () => void;
  sidebarColapsada?: boolean;
  acciones?: ReactNode;
}

export function Navbar({
  titulo = 'Gestión Gastronómica',
  alAlternarMenuMovil,
  alAlternarColapsoEscritorio,
  sidebarColapsada = false,
  acciones,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6">
      <div className="flex items-center gap-3">
        {/* Botón para Drawer Móvil */}
        <button
          type="button"
          onClick={alAlternarMenuMovil}
          aria-label="Abrir menú de navegación"
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Botón para Colapsar Sidebar en Escritorio */}
        {alAlternarColapsoEscritorio && (
          <button
            type="button"
            onClick={alAlternarColapsoEscritorio}
            aria-label={sidebarColapsada ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            className="hidden h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 md:flex"
          >
            {sidebarColapsada ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800 truncate">{titulo}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {acciones}
        <Badge variant="neutral">Sistema de gestión</Badge>
      </div>
    </header>
  );
}
