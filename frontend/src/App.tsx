import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

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

const ReservasPage = lazy(() =>
  import('./modules/reservas/pages/ReservasPage').then((modulo) => ({
    default: modulo.ReservasPage,
  })),
);

const PagosPage = lazy(() =>
  import('./modules/pagos/pages/PagosPage').then((modulo) => ({
    default: modulo.PagosPage,
  })),
);

export default function App() {
  return (
    <AppProviders>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Inicio />} />
          <Route path="productos" element={<ProductosPage />} />
          <Route path="productos/carta" element={<CartaPage />} />
          <Route path="reportes/productos-mas-vendidos" element={<ReporteMasVendidosPage />} />
          <Route path="reportes/mesas-ventas-por-mozo" element={<ReporteMozosPage />} />
          <Route path="menus" element={<MenusPage />} />
          <Route path="salon" element={<SalonPage />} />
          <Route path="atencion" element={<AtencionPage />} />
          <Route path="reservas" element={<ReservasPage />} />
          <Route path="pagos" element={<PagosPage />} />
          <Route path="reportes" element={<ReportesPage />} />
          <Route path="componentes" element={<ComponentesPage />} />
          <Route path="salud" element={<EstadoBackend />} />
          <Route path="403" element={<ForbiddenPage />} />
          <Route path="500" element={<ServerErrorPage />} />
          <Route path="503" element={<ServiceUnavailablePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AppProviders>
  );
}
