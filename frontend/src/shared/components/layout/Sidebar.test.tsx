import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';

import { usarRoles } from '../../../test/sesionDePrueba';

import { Sidebar } from './Sidebar';

function renderizar() {
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
}

function nombresDelMenu(): string[] {
  const menu = screen.getByRole('navigation', { name: 'Módulos del restaurante' });
  return Array.from(menu.querySelectorAll('a')).map((enlace) => enlace.textContent ?? '');
}

it('el encargado ve todos los módulos, incluido Reportes', () => {
  usarRoles(['ENCARGADO']);
  renderizar();

  expect(nombresDelMenu()).toEqual([
    'Productos y Carta',
    'Menús y Promociones',
    'Salón, Mozos y Chefs',
    'Atención al Público',
    'Reservas',
    'Pagos',
    'Reportes',
  ]);
});

it('el mozo no ve Reportes', () => {
  usarRoles(['MOZO']);
  renderizar();

  expect(nombresDelMenu()).toEqual([
    'Productos y Carta',
    'Menús y Promociones',
    'Salón, Mozos y Chefs',
    'Atención al Público',
    'Reservas',
    'Pagos',
  ]);
});

it('el chef no ve Salón, Pagos ni Reportes', () => {
  usarRoles(['CHEF']);
  renderizar();

  expect(nombresDelMenu()).toEqual([
    'Productos y Carta',
    'Menús y Promociones',
    'Atención al Público',
    'Reservas',
  ]);
});

it('un usuario con dos roles ve la unión de los menús', () => {
  usarRoles(['MOZO', 'CHEF']);
  renderizar();

  expect(nombresDelMenu()).toContain('Pagos');
  expect(nombresDelMenu()).not.toContain('Reportes');
});

it('los enlaces de referencia siguen visibles para cualquier rol', () => {
  usarRoles(['CHEF']);
  renderizar();

  expect(screen.getByRole('link', { name: /Guía de componentes/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Estado del backend/ })).toBeInTheDocument();
});
