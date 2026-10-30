import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  darDeBajaMenuEjecutivo,
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
    datos: {
      items: [{ id: 2, nombre: 'Principal', estado: 'HABILITADO' }],
      total: 1,
      limit: 100,
      offset: 0,
    },
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

  it('abre la edición con los datos del menú cargados', async () => {
    render(<MenusPage />);
    await screen.findByText('Almuerzo ejecutivo');

    fireEvent.click(screen.getByRole('button', { name: 'Editar «Almuerzo ejecutivo»' }));

    const dialogo = screen.getByRole('dialog', { name: 'Editar menú ejecutivo' });
    expect(within(dialogo).getByLabelText(/Nombre/)).toHaveValue('Almuerzo ejecutivo');
    expect(within(dialogo).getByLabelText(/Precio fijo/)).toHaveValue('1500.00');
    expect(within(dialogo).getByLabelText(/Estado/)).toHaveValue('HABILITADO');
    expect(within(dialogo).getByRole('checkbox', { name: 'Incluir Plato' })).toBeChecked();
  });

  it('no da de baja el menú si se cancela la confirmación', async () => {
    render(<MenusPage />);
    await screen.findByText('Almuerzo ejecutivo');

    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja «Almuerzo ejecutivo»' }));

    await waitFor(() => expect(darDeBajaMenuEjecutivo).not.toHaveBeenCalled());
    expect(screen.getByText('Almuerzo ejecutivo')).toBeInTheDocument();
  });
});
