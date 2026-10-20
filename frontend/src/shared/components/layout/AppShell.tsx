import { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CargandoPagina } from '../CargandoPagina';
import { ErrorBoundary } from '../ErrorBoundary';
import { Sheet } from '../ui/sheet';
import { Navbar } from './Navbar';
import { ELEMENTOS_NAVEGACION } from './navegacion';
import { Sidebar } from './Sidebar';

export function AppShell() {
  const [menuMovilAbierto, setMenuMovilAbierto] = useState<boolean>(false);
  const [sidebarColapsada, setSidebarColapsada] = useState<boolean>(false);
  const location = useLocation();

  // Determinar título contextual según la ruta
  const elementoActual = ELEMENTOS_NAVEGACION.find((item) =>
    location.pathname.startsWith(item.ruta),
  );

  let tituloSeccion = 'Inicio';
  if (elementoActual) {
    tituloSeccion = elementoActual.nombre;
  } else if (location.pathname === '/salud') {
    tituloSeccion = 'Estado del Backend';
  } else if (location.pathname === '/componentes') {
    tituloSeccion = 'Guía de componentes';
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar Fija en Escritorio */}
      <div className="hidden md:block">
        <Sidebar colapsada={sidebarColapsada} className="sticky top-0 h-screen" />
      </div>

      {/* Drawer Móvil (Sheet) */}
      <Sheet
        open={menuMovilAbierto}
        onOpenChange={setMenuMovilAbierto}
        side="left"
        title="GastroAdmin"
      >
        <Sidebar
          alSeleccionarEnlace={() => setMenuMovilAbierto(false)}
          className="border-none p-0 w-full"
        />
      </Sheet>

      {/* Contenedor Principal */}
      <div className="flex flex-1 flex-col min-w-0">
        <Navbar
          titulo={tituloSeccion}
          alAlternarMenuMovil={() => setMenuMovilAbierto(true)}
          alAlternarColapsoEscritorio={() => setSidebarColapsada((prev) => !prev)}
          sidebarColapsada={sidebarColapsada}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
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
