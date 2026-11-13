import { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CargandoPagina } from '../CargandoPagina';
import { ErrorBoundary } from '../ErrorBoundary';
import { Sheet } from '../ui/sheet';
import { BotonTema } from './BotonTema';
import { MenuSesion } from './MenuSesion';
import { Navbar } from './Navbar';
import { ELEMENTOS_NAVEGACION } from './navegacion';
import { Sidebar } from './Sidebar';

const TITULOS_EXTRA: Record<string, string> = {
  '/salud': 'Estado del backend',
  '/componentes': 'Guía de componentes',
  '/reportes': 'Reportes',
  '/403': 'Sin permiso',
  '/500': 'Error del servidor',
  '/503': 'Servicio no disponible',
};

function tituloParaRuta(ruta: string): string {
  if (ruta === '/') return 'Inicio';
  const elemento = ELEMENTOS_NAVEGACION.find(
    (item) => ruta === item.ruta || ruta.startsWith(`${item.ruta}/`),
  );
  if (elemento) return elemento.nombre;
  const extra = Object.entries(TITULOS_EXTRA).find(([base]) => ruta.startsWith(base));
  if (extra) return extra[1];
  return 'Página no encontrada';
}

export function AppShell() {
  const [menuMovilAbierto, setMenuMovilAbierto] = useState<boolean>(false);
  const [sidebarColapsada, setSidebarColapsada] = useState<boolean>(false);
  const location = useLocation();
  const tituloSeccion = tituloParaRuta(location.pathname);
  const cerrarMenuMovil = () => setMenuMovilAbierto(false);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <a href="#contenido" className="enlace-salto">
        Saltar al contenido
      </a>
      {/* Sidebar Fija en Escritorio */}
      <div className="hidden md:block">
        <Sidebar colapsada={sidebarColapsada} className="sticky top-0 h-screen" />
      </div>

      {/* Drawer Móvil (Sheet) */}
      <Sheet
        open={menuMovilAbierto}
        onOpenChange={setMenuMovilAbierto}
        side="left"
        title="GastroAdmin · Menú"
      >
        <Sidebar alSeleccionarEnlace={cerrarMenuMovil} className="w-full border-none p-0" />
      </Sheet>

      {/* Contenedor Principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          titulo={tituloSeccion}
          alAlternarMenuMovil={() => setMenuMovilAbierto(true)}
          alAlternarColapsoEscritorio={() => setSidebarColapsada((prev) => !prev)}
          sidebarColapsada={sidebarColapsada}
          acciones={
            <>
              <BotonTema />
              <MenuSesion />
            </>
          }
        />

        <main
          id="contenido"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 scroll-mt-20 p-4 outline-none sm:p-6 lg:p-8"
        >
          <ErrorBoundary>
            <Suspense fallback={<CargandoPagina />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
