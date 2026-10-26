import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { ComponentesPage } from './shared/components/ComponentesPage';
import { AppProviders } from './shared/components/AppProviders';
import { EstadoBackend } from './shared/components/EstadoBackend';
import { ForbiddenPage } from './shared/components/ForbiddenPage';
import { Inicio } from './shared/components/Inicio';
import { AppShell } from './shared/components/layout/AppShell';
import { NotFoundPage } from './shared/components/NotFoundPage';
import { ServerErrorPage } from './shared/components/ServerErrorPage';
import { ServiceUnavailablePage } from './shared/components/ServiceUnavailablePage';

const ProductosPage = lazy(() =>
  import('./modules/productos/pages/ProductosPage').then((modulo) => ({
    default: modulo.ProductosPage,
  })),
);

const ProductoNuevoPage = lazy(() =>
  import('./modules/productos/pages/ProductoNuevoPage').then((modulo) => ({
    default: modulo.ProductoNuevoPage,
  })),
);

const ProductoEditarPage = lazy(() =>
  import('./modules/productos/pages/ProductoEditarPage').then((modulo) => ({
    default: modulo.ProductoEditarPage,
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
          <Route path="productos/platos/nuevo" element={<ProductoNuevoPage categoria="PLATO" />} />
          <Route
            path="productos/postres/nuevo"
            element={<ProductoNuevoPage categoria="POSTRE" />}
          />
          <Route
            path="productos/platos/:id/editar"
            element={<ProductoEditarPage categoria="PLATO" />}
          />
          <Route
            path="productos/postres/:id/editar"
            element={<ProductoEditarPage categoria="POSTRE" />}
          />
          <Route
            path="productos/nuevo"
            element={<Navigate to="/productos/platos/nuevo" replace />}
          />
          <Route path="menus" element={<MenusPage />} />
          <Route path="salon" element={<SalonPage />} />
          <Route path="atencion" element={<AtencionPage />} />
          <Route path="reservas" element={<ReservasPage />} />
          <Route path="pagos" element={<PagosPage />} />
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
