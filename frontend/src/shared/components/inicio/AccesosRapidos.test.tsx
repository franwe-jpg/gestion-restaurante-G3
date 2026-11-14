import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';

import { usarRoles } from '../../../test/sesionDePrueba';

import { AccesosRapidos } from './AccesosRapidos';

function renderizar() {
  render(
    <MemoryRouter>
      <AccesosRapidos />
    </MemoryRouter>,
  );
}

it('ofrece «Nueva comanda» hacia /atencion?nueva=1', () => {
  renderizar();

  expect(screen.getByRole('link', { name: 'Nueva comanda' })).toHaveAttribute(
    'href',
    '/atencion?nueva=1',
  );
});

it('ofrece «Nueva reserva» hacia /reservas?nueva=1', () => {
  renderizar();

  expect(screen.getByRole('link', { name: 'Nueva reserva' })).toHaveAttribute(
    'href',
    '/reservas?nueva=1',
  );
});

it('el chef no ve ningún acceso de operación', () => {
  usarRoles(['CHEF']);
  renderizar();

  expect(screen.queryByRole('link', { name: 'Nueva comanda' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Nueva reserva' })).not.toBeInTheDocument();
});

it('cada acceso exige su propio permiso de operación', () => {
  usarRoles(['CHEF'], {
    puede: (permiso) => permiso === 'RESERVAS_OPERAR',
  });
  renderizar();

  expect(screen.queryByRole('link', { name: 'Nueva comanda' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Nueva reserva' })).toBeInTheDocument();
});
