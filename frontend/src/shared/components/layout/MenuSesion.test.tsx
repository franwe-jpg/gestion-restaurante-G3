import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, it, vi } from 'vitest';

import { usarRoles } from '../../../test/sesionDePrueba';

import { MenuSesion } from './MenuSesion';

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/atencion']}>
      <Routes>
        <Route path="/atencion" element={<MenuSesion />} />
        <Route path="/login" element={<p>Pantalla de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function abrirMenu(expresion: string | RegExp) {
  fireEvent.click(screen.getByRole('button', { name: expresion }));
}

it('sin usuario no muestra nada', () => {
  usarRoles(['MOZO'], { usuario: null });
  renderizar();

  expect(screen.queryByRole('button', { name: /Sesión de/ })).not.toBeInTheDocument();
});

it('con un solo rol no ofrece cambio de rol', () => {
  usarRoles(['MOZO']);
  renderizar();
  abrirMenu(/Sesión de/);

  expect(screen.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: /Mozo/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: 'Todos los roles' })).not.toBeInTheDocument();
});

it('con dos roles ofrece cambiar y el cierre de sesión', async () => {
  const fijarRolActivo = vi.fn();
  const cerrarSesion = vi.fn().mockResolvedValue(undefined);
  usarRoles(['MOZO', 'CHEF'], { rolActivo: null, fijarRolActivo, cerrarSesion });
  renderizar();
  abrirMenu(/Sesión de/);

  fireEvent.click(screen.getByRole('menuitem', { name: /Chef/ }));
  expect(fijarRolActivo).toHaveBeenCalledWith('CHEF');

  abrirMenu(/Sesión de/);
  fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));

  await waitFor(() => expect(screen.getByText('Pantalla de login')).toBeInTheDocument());
  expect(cerrarSesion).toHaveBeenCalledTimes(1);
});
