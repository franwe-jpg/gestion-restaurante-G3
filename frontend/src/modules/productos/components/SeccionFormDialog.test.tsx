import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '../../../shared/components/ui/confirm-dialog';
import { crearSeccion } from '../api';
import type { ProductoSeleccionable } from '../types';

import { SeccionFormDialog } from './SeccionFormDialog';

vi.mock('../api');

const PRODUCTOS: ProductoSeleccionable[] = [
  { id: 4, nombre: 'Flan', categoria: 'POSTRE', seccion: { id: 1, nombre: 'Postres' } },
];

const CREADA = {
  id: 9,
  nombre: 'Entradas',
  orden: 1,
  estado: 'HABILITADO' as const,
  productos: [],
  productos_habilitados: 0,
};

function abrir(productos = PRODUCTOS) {
  const onCreada = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ConfirmProvider>
      <SeccionFormDialog productos={productos} onCreada={onCreada} onOpenChange={onOpenChange} />
    </ConfirmProvider>,
  );
  return { onCreada, onOpenChange };
}

function completar(nombre: string, orden: string) {
  fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: nombre } });
  fireEvent.change(screen.getByLabelText(/Orden/), { target: { value: orden } });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('SeccionFormDialog: validación y alta', () => {
  it('con campos vacíos no envía y marca qué falta (CA 2)', () => {
    abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('El orden es obligatorio.')).toBeInTheDocument();
    expect(crearSeccion).not.toHaveBeenCalled();
  });

  it('advierte un nombre largo y un orden inválido sin enviar (CA 4 y 5)', () => {
    abrir();
    completar('a'.repeat(51), '2.5');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByText(/supera los 50 caracteres/)).toBeInTheDocument();
    expect(screen.getByText(/número entero mayor a cero/)).toBeInTheDocument();
    expect(crearSeccion).not.toHaveBeenCalled();
  });

  it('crea la sección sin productos y avisa a quien lo abrió (CA 1)', async () => {
    vi.mocked(crearSeccion).mockResolvedValue({ datos: CREADA, exito: true });
    const { onCreada } = abrir();
    completar('  Entradas ', '1');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onCreada).toHaveBeenCalledTimes(1));
    expect(crearSeccion).toHaveBeenCalledWith({
      nombre: 'Entradas',
      orden: 1,
      producto_ids: [],
      confirmar_traslado: false,
    });
  });
});

describe('SeccionFormDialog: errores del servidor', () => {
  it('muestra el 409 de nombre repetido bajo el campo (CA 3)', async () => {
    vi.mocked(crearSeccion).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La sección ya existe',
    });
    const { onCreada } = abrir();
    completar('Postres', '1');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Ya existe una sección con ese nombre.')).toBeInTheDocument();
    expect(onCreada).not.toHaveBeenCalled();
  });

  it('muestra el 409 de posición ocupada bajo el campo orden (CA 6)', async () => {
    vi.mocked(crearSeccion).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'Posición ocupada: otra sección habilitada usa ese orden',
    });
    abrir();
    completar('Entradas', '1');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      await screen.findByText('Esa posición está ocupada por otra sección habilitada.'),
    ).toBeInTheDocument();
  });

  it('muestra otros errores del servidor en una alerta', async () => {
    vi.mocked(crearSeccion).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });
    abrir();
    completar('Entradas', '1');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('No se pudo conectar con el backend')).toBeInTheDocument();
  });
});

describe('SeccionFormDialog: traslado de productos', () => {
  it('pide confirmar el traslado antes de enviar y envía una sola vez con true (CA 8)', async () => {
    vi.mocked(crearSeccion).mockResolvedValue({ datos: CREADA, exito: true });
    const { onCreada } = abrir();
    completar('Entradas', '1');
    fireEvent.click(screen.getByLabelText('Flan (sección actual: Postres)'));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/Flan \(sección Postres\)/)).toBeInTheDocument();
    expect(crearSeccion).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Trasladar' }));

    await waitFor(() => expect(onCreada).toHaveBeenCalledTimes(1));
    expect(crearSeccion).toHaveBeenCalledTimes(1);
    expect(crearSeccion).toHaveBeenCalledWith({
      nombre: 'Entradas',
      orden: 1,
      producto_ids: [4],
      confirmar_traslado: true,
    });
  });

  it('al cancelar la confirmación no envía y conserva los datos (CA 8)', async () => {
    abrir();
    completar('Entradas', '3');
    fireEvent.click(screen.getByLabelText('Flan (sección actual: Postres)'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await screen.findByText(/Flan \(sección Postres\)/);

    fireEvent.click(screen.getByRole('button', { name: 'No trasladar' }));

    await waitFor(() => expect(screen.queryByText(/Flan \(sección Postres\)/)).toBeNull());
    expect(crearSeccion).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Entradas');
    expect(screen.getByLabelText(/Orden/)).toHaveValue('3');
    expect(screen.getByLabelText('Flan (sección actual: Postres)')).toBeChecked();
  });
});
