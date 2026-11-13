import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, it, vi } from 'vitest';

import { usarRoles } from '../../../test/sesionDePrueba';

import { MenuUsuario } from './MenuUsuario';

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/atencion']}>
      <Routes>
        <Route path="/atencion" element={<MenuUsuario />} />
        <Route path="/login" element={<p>Pantalla de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

it('muestra el correo y los roles cuando no hay nombre', () => {
  usarRoles(['MOZO', 'CHEF']);
  renderizar();

  expect(screen.getByText('prueba@resto.com')).toBeInTheDocument();
  expect(screen.getByText('Mozo · Chef')).toBeInTheDocument();
});

it('muestra el nombre y el apellido cuando existen', () => {
  usarRoles(['ENCARGADO'], {
    usuario: {
      id: 2,
      correo: 'ana@resto.com',
      roles: ['ENCARGADO'],
      nombre: 'Ana',
      apellido: 'Paz',
    },
  });
  renderizar();

  expect(screen.getByText('Ana Paz')).toBeInTheDocument();
  expect(screen.getByText('Encargado')).toBeInTheDocument();
});

it('«Cerrar sesión» cierra la sesión y vuelve a /login', async () => {
  const cerrarSesion = vi.fn().mockResolvedValue(undefined);
  usarRoles(['MOZO'], { cerrarSesion });
  renderizar();

  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

  await waitFor(() => expect(screen.getByText('Pantalla de login')).toBeInTheDocument());
  expect(cerrarSesion).toHaveBeenCalledTimes(1);
});

it('sin usuario no muestra nada', () => {
  usarRoles(['MOZO'], { usuario: null });
  renderizar();

  expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
});
