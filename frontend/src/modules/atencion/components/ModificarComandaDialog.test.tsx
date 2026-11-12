import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import * as api from '../api';
import { ModificarComandaDialog } from './ModificarComandaDialog';

vi.mock('../api', () => ({
  obtenerComanda: vi.fn(),
  modificarComanda: vi.fn(),
  listarMesas: vi.fn(),
  listarProductos: vi.fn(),
  listarMenusEjecutivos: vi.fn(),
}));

const pagina = <T,>(items: T[]) => ({
  exito: true,
  datos: { items, total: items.length, limit: 100, offset: 0 },
});
const COMANDA = {
  id: 3,
  mesa_id: 7,
  mozo_id: null,
  estado: 'ABIERTA' as const,
  fecha_hora: '2026-10-31T12:30:00Z',
  detalles: [
    {
      id: 81,
      producto_id: 11,
      menu_ejecutivo_id: null,
      cantidad: 2,
      precio_unitario: '9000.00',
      descuento: '0.00',
      promocion_id: null,
      estado_entrega: 'PENDIENTE' as const,
    },
    {
      id: 82,
      producto_id: null,
      menu_ejecutivo_id: 21,
      cantidad: 1,
      precio_unitario: '12000.00',
      descuento: '0.00',
      promocion_id: null,
      estado_entrega: 'PENDIENTE' as const,
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.obtenerComanda).mockResolvedValue({ exito: true, datos: COMANDA });
  vi.mocked(api.listarProductos).mockResolvedValue(
    pagina([
      { id: 11, nombre: 'Milanesa', precio: '9000.00', estado: 'HABILITADO' as const },
      { id: 12, nombre: 'Flan', precio: '3000.00', estado: 'HABILITADO' as const },
    ]),
  );
  vi.mocked(api.listarMenusEjecutivos).mockResolvedValue(
    pagina([
      { id: 21, nombre: 'Menú del día', precio_fijo: '12000.00', estado: 'HABILITADO' as const },
    ]),
  );
});

it('muestra los nombres de producto y menú en los detalles actuales', async () => {
  render(<ModificarComandaDialog id={3} onSalir={vi.fn()} onModificada={vi.fn()} />);
  expect(await screen.findByText('Milanesa — cantidad 2')).toBeInTheDocument();
  expect(screen.getByText('Menú del día — cantidad 1')).toBeInTheDocument();
});

it('agrega una línea con los selectores y envía el ID elegido sin campos de ID', async () => {
  vi.mocked(api.modificarComanda).mockResolvedValue({ exito: true, datos: COMANDA });
  render(<ModificarComandaDialog id={3} onSalir={vi.fn()} onModificada={vi.fn()} />);
  await screen.findByText('Milanesa — cantidad 2');
  fireEvent.click(screen.getByRole('button', { name: 'Agregar línea' }));
  await screen.findByRole('option', { name: 'Flan · $3000.00' });
  expect(screen.queryByLabelText(/\(ID\)/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Producto 1'), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() =>
    expect(api.modificarComanda).toHaveBeenCalledWith(3, {
      quitar: [],
      agregar: [{ producto_id: 12, menu_ejecutivo_id: null, cantidad: 1 }],
    }),
  );
});

it('no llama a la API si una línea nueva no tiene selección', async () => {
  render(<ModificarComandaDialog id={3} onSalir={vi.fn()} onModificada={vi.fn()} />);
  await screen.findByText('Milanesa — cantidad 2');
  fireEvent.click(screen.getByRole('button', { name: 'Agregar línea' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByText('Elegí un producto o menú en la línea 1')).toBeInTheDocument();
  expect(api.modificarComanda).not.toHaveBeenCalled();
});
