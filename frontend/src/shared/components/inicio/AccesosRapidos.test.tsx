import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';

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
