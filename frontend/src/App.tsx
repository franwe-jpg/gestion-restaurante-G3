import { lazy, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';

import { LoginPage } from './shared/auth/LoginPage';
import type { Permiso } from './shared/auth/permisos';
import { RutaConPermiso } from './shared/auth/RutaConPermiso';
import { RutaProtegida } from './shared/auth/RutaProtegida';
import { ComponentesPage } from './shared/components/ComponentesPage';
import { AppProviders } from './shared/components/AppProviders';
import { EstadoBackend } from './shared/components/EstadoBackend';
import { ForbiddenPage } from './shared/components/ForbiddenPage';
import { Inicio } from './shared/components/Inicio';
import { AppShell } from './shared/components/layout/AppShell';
import { NotFoundPage } from './shared/components/NotFoundPage';
import { ReportesPage } from './shared/components/ReportesPage';
import { ServerErrorPage } from './shared/components/ServerErrorPage';
import { ServiceUnavailablePage } from './shared/components/ServiceUnavailablePage';

const ProductosPage = lazy(() =>
  import('./modules/productos/pages/ProductosPage').then((modulo) => ({
    default: modulo.ProductosPage,
  })),
);

const CartaPage = lazy(() =>
  import('./modules/productos/pages/CartaPage').then((modulo) => ({
    default: modulo.CartaPage,
  })),
);

const ReporteMasVendidosPage = lazy(() =>
  import('./modules/productos/pages/ReporteMasVendidosPage').then((modulo) => ({
    default: modulo.ReporteMasVendidosPage,
  })),
);

const MenusPage = lazy(() =>
  import('./modules/menus/pages/MenusPage').then((modulo) => ({
    default: modulo.MenusPage,
  })),
);

const ReporteImpactoPromocionesPage = lazy(() =>
  import('./modules/menus/pages/ReporteImpactoPromocionesPage').then((modulo) => ({
    default: modulo.ReporteImpactoPromocionesPage,
  })),
);

const SalonPage = lazy(() =>
  import('./modules/salon/pages/SalonPage').then((modulo) => ({
    default: modulo.SalonPage,
  })),
);

const ReporteMozosPage = lazy(() =>
  import('./modules/salon/pages/ReporteMozosPage').then((modulo) => ({
    default: modulo.ReporteMozosPage,
  })),
);

const AtencionPage = lazy(() =>
  import('./modules/atencion/pages/AtencionPage').then((modulo) => ({
    default: modulo.AtencionPage,
  })),
);

const ReporteComandasPage = lazy(() =>
  import('./modules/atencion/pages/ReporteComandasPage').then((modulo) => ({
    default: modulo.ReporteComandasPage,
  })),
);

const ReservasPage = lazy(() =>
  import('./modules/reservas/pages/ReservasPage').then((modulo) => ({
    default: modulo.ReservasPage,
  })),
);

const ReporteReservasAusentismoPage = lazy(() =>
  import('./modules/reservas/pages/ReporteReservasAusentismoPage').then((modulo) => ({
    default: modulo.ReporteReservasAusentismoPage,
  })),
);

const PagosPage = lazy(() =>
  import('./modules/pagos/pages/PagosPage').then((modulo) => ({
    default: modulo.PagosPage,
  })),
);
const ReporteRecaudacionPage = lazy(() =>
  import('./modules/pagos/pages/ReporteRecaudacionPage').then((modulo) => ({
    default: modulo.ReporteRecaudacionPage,
  })),
);

function conPermiso(permiso: Permiso, pantalla: ReactNode) {
  return <RutaConPermiso permiso={permiso}>{pantalla}</RutaConPermiso>;
}

export default function App() {
  return (
    <AppProviders>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RutaProtegida />}>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Inicio />} />
            <Route path="productos" element={conPermiso('CARTA_VER', <ProductosPage />)} />
            <Route path="productos/carta" element={conPermiso('CARTA_VER', <CartaPage />)} />
            <Route
              path="reportes/productos-mas-vendidos"
              element={conPermiso('REPORTES_VER', <ReporteMasVendidosPage />)}
            />
            <Route
              path="reportes/mesas-ventas-por-mozo"
              element={conPermiso('REPORTES_VER', <ReporteMozosPage />)}
            />
            <Route
              path="reportes/impacto-promociones"
              element={conPermiso('REPORTES_VER', <ReporteImpactoPromocionesPage />)}
            />
            <Route path="menus" element={conPermiso('MENUS_VER', <MenusPage />)} />
            <Route path="salon" element={conPermiso('SALON_VER', <SalonPage />)} />
            <Route path="atencion" element={conPermiso('COMANDAS_VER', <AtencionPage />)} />
            <Route
              path="reportes/comandas-ticket-promedio"
              element={conPermiso('REPORTES_VER', <ReporteComandasPage />)}
            />
            <Route path="reservas" element={conPermiso('RESERVAS_VER', <ReservasPage />)} />
            <Route
              path="reportes/reservas-ausentismo"
              element={conPermiso('REPORTES_VER', <ReporteReservasAusentismoPage />)}
            />
            <Route path="pagos" element={conPermiso('PAGOS_OPERAR', <PagosPage />)} />
            <Route
              path="reportes/recaudacion-por-medio-de-pago"
              element={conPermiso('REPORTES_VER', <ReporteRecaudacionPage />)}
            />
            <Route path="reportes" element={conPermiso('REPORTES_VER', <ReportesPage />)} />
            <Route path="componentes" element={<ComponentesPage />} />
            <Route path="salud" element={<EstadoBackend />} />
            <Route path="403" element={<ForbiddenPage />} />
            <Route path="500" element={<ServerErrorPage />} />
            <Route path="503" element={<ServiceUnavailablePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </AppProviders>
  );
}
