import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  listarMenusEjecutivos,
  listarProductosHabilitados,
  listarSeccionesHabilitadas,
} from '../api';
import type { MenuEjecutivo } from '../types';

import { MenusPage } from './MenusPage';

vi.mock('../api');

const MENU: MenuEjecutivo = {
  id: 1,
  nombre: 'Almuerzo ejecutivo',
  descripcion: null,
  precio_fijo: '1500.00',
  estado: 'HABILITADO',
  seccion: { id: 2, nombre: 'Principal' },
  productos: [{ id: 3, nombre: 'Plato', categoria: 'PLATO', estado: 'HABILITADO' }],
};

beforeEach(() => {
  vi.mocked(listarMenusEjecutivos).mockResolvedValue({
    datos: { items: [MENU], total: 1, limit: 10, offset: 0 },
    exito: true,
  });
  vi.mocked(listarProductosHabilitados).mockResolvedValue({
    datos: [
      {
        id: 3,
        nombre: 'Plato',
        categoria: 'PLATO',
        estado: 'HABILITADO',
        seccion: { id: 2, nombre: 'Principal' },
      },
    ],
    exito: true,
  });
  vi.mocked(listarSeccionesHabilitadas).mockResolvedValue({
    datos: [{ id: 2, nombre: 'Principal', estado: 'HABILITADO' }],
    exito: true,
  });
});

describe('MenusPage', () => {
  it('muestra el listado de ejecutivos y permite abrir el alta', async () => {
    render(<MenusPage />);

    expect(await screen.findByText('Almuerzo ejecutivo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo menú ejecutivo' }));

    expect(screen.getByRole('dialog', { name: 'Nuevo menú ejecutivo' })).toBeInTheDocument();
    expect(await screen.findByRole('checkbox', { name: 'Incluir Plato' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Principal' })).toBeInTheDocument();
  });
});
