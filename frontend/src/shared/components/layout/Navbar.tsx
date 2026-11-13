import type { ReactNode } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

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
    <header className="sticky top-0 z-30 flex min-h-16 w-full items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur-xs sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Botón para Drawer Móvil */}
        <button
          type="button"
          onClick={alAlternarMenuMovil}
          aria-label="Abrir menú de navegación"
          aria-expanded="false"
          className="focus-visible:ring-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Botón para Colapsar Sidebar en Escritorio */}
        {alAlternarColapsoEscritorio && (
          <button
            type="button"
            onClick={alAlternarColapsoEscritorio}
            aria-label={sidebarColapsada ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            aria-expanded={!sidebarColapsada}
            className="focus-visible:ring-primary hidden h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 md:flex"
          >
            {sidebarColapsada ? (
              <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        )}

        <p aria-live="polite" className="min-w-0 truncate text-sm font-medium text-slate-800">
          <span className="mr-2 hidden text-slate-400 sm:inline" aria-hidden="true">
            GastroAdmin /
          </span>
          {titulo}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">{acciones}</div>
    </header>
  );
}
