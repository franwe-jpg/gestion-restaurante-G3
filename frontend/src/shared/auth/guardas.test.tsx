import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { expect, it } from 'vitest';

import { sinSesion, usarRoles } from '../../test/sesionDePrueba';

import { RutaConPermiso } from './RutaConPermiso';
import { RutaProtegida } from './RutaProtegida';

function EstadoDelLogin() {
  const location = useLocation();
  const estado = location.state as { desde?: string } | null;
  return <p>Login desde {estado?.desde ?? 'ninguna'}</p>;
}

function renderizar(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/login" element={<EstadoDelLogin />} />
        <Route element={<RutaProtegida />}>
          <Route path="/" element={<p>Inicio</p>} />
          <Route
            path="/pagos"
            element={
              <RutaConPermiso permiso="PAGOS_OPERAR">
                <p>Pantalla de pagos</p>
              </RutaConPermiso>
            }
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

it('sin sesión redirige a /login y conserva la ruta de origen', () => {
  sinSesion();
  renderizar('/pagos?x=1');

  expect(screen.getByText('Login desde /pagos?x=1')).toBeInTheDocument();
  expect(screen.queryByText('Pantalla de pagos')).not.toBeInTheDocument();
});

it('con sesión muestra la ruta protegida', () => {
  usarRoles(['ENCARGADO']);
  renderizar('/');

  expect(screen.getByText('Inicio')).toBeInTheDocument();
});

it('mientras restaura la sesión no redirige ni muestra la ruta', () => {
  sinSesion({ cargando: true });
  renderizar('/pagos');

  expect(screen.queryByText(/Login desde/)).not.toBeInTheDocument();
  expect(screen.queryByText('Pantalla de pagos')).not.toBeInTheDocument();
  expect(screen.getByText('Cargando sesión...')).toBeInTheDocument();
});

it('con el permiso muestra la pantalla', () => {
  usarRoles(['MOZO']);
  renderizar('/pagos');

  expect(screen.getByText('Pantalla de pagos')).toBeInTheDocument();
});

it('sin el permiso lleva al inicio y no monta la pantalla', () => {
  usarRoles(['CHEF']);
  renderizar('/pagos');

  expect(screen.getByText('Inicio')).toBeInTheDocument();
  expect(screen.queryByText('Pantalla de pagos')).not.toBeInTheDocument();
});
