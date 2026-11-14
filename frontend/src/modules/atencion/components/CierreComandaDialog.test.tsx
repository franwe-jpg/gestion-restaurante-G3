import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import * as api from '../api';
import { CierreComandaDialog } from './CierreComandaDialog';

vi.mock('../api', () => ({
  consultarPendientes: vi.fn(),
  cerrarComanda: vi.fn(),
  listarProductos: vi.fn(),
  listarMenusEjecutivos: vi.fn(),
}));

const pagina = <T,>(items: T[]) => ({
  exito: true,
  datos: { items, total: items.length, limit: 100, offset: 0 },
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.consultarPendientes).mockResolvedValue({
    exito: true,
    datos: {
      comanda_id: 3,
      pendientes: [
        { id: 81, producto_id: 11, menu_ejecutivo_id: null, cantidad: 2 },
        { id: 82, producto_id: null, menu_ejecutivo_id: 21, cantidad: 1 },
      ],
    },
  });
  vi.mocked(api.listarProductos).mockResolvedValue(
    pagina([{ id: 11, nombre: 'Milanesa', precio: '9000.00', estado: 'DESHABILITADO' as const }]),
  );
  vi.mocked(api.listarMenusEjecutivos).mockResolvedValue(
    pagina([
      { id: 21, nombre: 'Menú del día', precio_fijo: '12000.00', estado: 'HABILITADO' as const },
    ]),
  );
});

function abrir() {
  render(<CierreComandaDialog id={3} onSalir={vi.fn()} onCerrada={vi.fn()} onEntregas={vi.fn()} />);
}

it('muestra el nombre del producto y del menú pendientes', async () => {
  abrir();
  expect(await screen.findByText(/Detalle #81: Milanesa — cantidad 2/)).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByText(/Detalle #82: Menú del día — cantidad 1/)).toBeInTheDocument(),
  );
});

it('usa el respaldo con el ID si falla la carga de nombres y no bloquea la acción', async () => {
  vi.mocked(api.listarMenusEjecutivos).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'HTTP 500',
  });
  abrir();
  expect(await screen.findByText(/Detalle #81: Producto #11 — cantidad 2/)).toBeInTheDocument();
  expect(screen.getByText(/Detalle #82: Menú #21 — cantidad 1/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Gestionar entregas' })).toBeEnabled();
});
