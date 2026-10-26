import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '../../../shared/components/ui/confirm-dialog';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import { crearSeccion, modificarSeccion } from '../api';
import type { ProductoSeleccionable, SeccionListado } from '../types';

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

const mostrarToast = vi.fn();

function abrir(productos = PRODUCTOS, seccion?: SeccionListado) {
  const onGuardada = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ToastContext.Provider value={{ mostrarToast }}>
      <ConfirmProvider>
        <SeccionFormDialog
          productos={productos}
          seccion={seccion}
          onGuardada={onGuardada}
          onOpenChange={onOpenChange}
        />
      </ConfirmProvider>
    </ToastContext.Provider>,
  );
  return { onGuardada, onOpenChange };
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
    const { onGuardada } = abrir();
    completar('  Entradas ', '1');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onGuardada).toHaveBeenCalledTimes(1));
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
    const { onGuardada } = abrir();
    completar('Postres', '1');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Ya existe una sección con ese nombre.')).toBeInTheDocument();
    expect(onGuardada).not.toHaveBeenCalled();
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
    const { onGuardada } = abrir();
    completar('Entradas', '1');
    fireEvent.click(screen.getByLabelText('Flan (sección actual: Postres)'));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/Flan \(sección Postres\)/)).toBeInTheDocument();
    expect(crearSeccion).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Trasladar' }));

    await waitFor(() => expect(onGuardada).toHaveBeenCalledTimes(1));
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

const POSTRES: SeccionListado = {
  id: 1,
  nombre: 'Postres',
  orden: 2,
  estado: 'HABILITADO',
  cantidad_productos: 1,
  productos_habilitados: 1,
};

const PRODUCTOS_EDICION: ProductoSeleccionable[] = [
  { id: 4, nombre: 'Flan', categoria: 'POSTRE', seccion: { id: 1, nombre: 'Postres' } },
  { id: 5, nombre: 'Milanesa', categoria: 'PLATO', seccion: { id: 3, nombre: 'Platos' } },
];

const MODIFICADA = { ...CREADA, id: 1, nombre: 'Postres', orden: 5 };

function editar(seccion: SeccionListado = POSTRES) {
  return abrir(PRODUCTOS_EDICION, seccion);
}

function guardar() {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
}

describe('SeccionFormDialog: edición', () => {
  it('muestra el título de edición con el nombre y el orden precargados (CA 1)', () => {
    editar();

    expect(screen.getByText('Editar sección')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Postres');
    expect(screen.getByLabelText(/Orden/)).toHaveValue('2');
  });

  it('envía los cambios, avisa y notifica a quien lo abrió (CA 1)', async () => {
    vi.mocked(modificarSeccion).mockResolvedValue({ datos: MODIFICADA, exito: true });
    const { onGuardada } = editar();
    completar(' Dulces ', '5');

    guardar();

    await waitFor(() => expect(onGuardada).toHaveBeenCalledTimes(1));
    expect(modificarSeccion).toHaveBeenCalledWith(1, {
      nombre: 'Dulces',
      orden: 5,
      producto_ids: [],
      confirmar_traslado: false,
    });
    expect(crearSeccion).not.toHaveBeenCalled();
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Sección modificada', variante: 'success' }),
    );
  });

  it('muestra el 409 de nombre y el de posición bajo su campo (CA 2)', async () => {
    vi.mocked(modificarSeccion).mockResolvedValueOnce({
      datos: null,
      exito: false,
      error: 'La sección ya existe',
    });
    editar();
    guardar();
    expect(await screen.findByText('Ya existe una sección con ese nombre.')).toBeInTheDocument();

    vi.mocked(modificarSeccion).mockResolvedValueOnce({
      datos: null,
      exito: false,
      error: 'Posición ocupada: otra sección habilitada usa ese orden',
    });
    guardar();
    expect(
      await screen.findByText('Esa posición está ocupada por otra sección habilitada.'),
    ).toBeInTheDocument();
  });

  it('muestra un error general si la respuesta no trae detalle', async () => {
    vi.mocked(modificarSeccion).mockResolvedValue({ datos: null, exito: false });
    editar();

    guardar();

    expect(await screen.findByText('No se pudo modificar la sección')).toBeInTheDocument();
  });
});

describe('SeccionFormDialog: productos en la edición', () => {
  it('marca los productos que ya son de la sección (CA 3)', () => {
    editar();

    expect(screen.getByLabelText('Flan (sección actual: Postres)')).toBeChecked();
    expect(screen.getByLabelText('Milanesa (sección actual: Platos)')).not.toBeChecked();
  });

  it('al desmarcar uno actual avisa y lo deja marcado (CA 4)', () => {
    editar();

    fireEvent.click(screen.getByLabelText('Flan (sección actual: Postres)'));

    expect(
      screen.getByText(
        'Todo producto debe pertenecer a una sección; para quitarlo, agréguelo a otra sección.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Flan (sección actual: Postres)')).toBeChecked();
  });

  it('confirma el traslado de los nuevos sin nombrar los actuales (CA 5)', async () => {
    vi.mocked(modificarSeccion).mockResolvedValue({ datos: MODIFICADA, exito: true });
    const { onGuardada } = editar();
    fireEvent.click(screen.getByLabelText('Milanesa (sección actual: Platos)'));

    guardar();

    expect(await screen.findByText(/Milanesa \(sección Platos\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Flan \(sección Postres\)/)).toBeNull();
    expect(modificarSeccion).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Trasladar' }));

    await waitFor(() => expect(onGuardada).toHaveBeenCalledTimes(1));
    expect(modificarSeccion).toHaveBeenCalledWith(1, {
      nombre: 'Postres',
      orden: 2,
      producto_ids: [5],
      confirmar_traslado: true,
    });
  });
});

describe('SeccionFormDialog: reactivación', () => {
  const DESHABILITADA: SeccionListado = { ...POSTRES, estado: 'DESHABILITADO' };

  it('la casilla de habilitar aparece solo con la sección deshabilitada (CA 7)', () => {
    editar();
    expect(screen.queryByLabelText('Habilitar la sección')).toBeNull();
  });

  it('marcada envía estado HABILITADO (CA 7)', async () => {
    vi.mocked(modificarSeccion).mockResolvedValue({ datos: MODIFICADA, exito: true });
    const { onGuardada } = editar(DESHABILITADA);
    fireEvent.click(screen.getByLabelText('Habilitar la sección'));

    guardar();

    await waitFor(() => expect(onGuardada).toHaveBeenCalledTimes(1));
    expect(modificarSeccion).toHaveBeenCalledWith(1, {
      nombre: 'Postres',
      orden: 2,
      producto_ids: [],
      confirmar_traslado: false,
      estado: 'HABILITADO',
    });
  });

  it('sin marcar omite el estado (H13)', async () => {
    vi.mocked(modificarSeccion).mockResolvedValue({ datos: MODIFICADA, exito: true });
    const { onGuardada } = editar(DESHABILITADA);
    expect(screen.getByLabelText('Habilitar la sección')).not.toBeChecked();

    guardar();

    await waitFor(() => expect(onGuardada).toHaveBeenCalledTimes(1));
    expect(vi.mocked(modificarSeccion).mock.calls[0]?.[1]).not.toHaveProperty('estado');
  });

  it('con la posición ocupada se corrige el orden y se guarda de nuevo (CA 7)', async () => {
    vi.mocked(modificarSeccion).mockResolvedValueOnce({
      datos: null,
      exito: false,
      error: 'Posición ocupada: otra sección habilitada usa ese orden',
    });
    vi.mocked(modificarSeccion).mockResolvedValueOnce({ datos: MODIFICADA, exito: true });
    const { onGuardada } = editar(DESHABILITADA);
    fireEvent.click(screen.getByLabelText('Habilitar la sección'));
    guardar();
    await screen.findByText('Esa posición está ocupada por otra sección habilitada.');

    fireEvent.change(screen.getByLabelText(/Orden/), { target: { value: '9' } });
    guardar();

    await waitFor(() => expect(onGuardada).toHaveBeenCalledTimes(1));
    expect(modificarSeccion).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({ orden: 9, estado: 'HABILITADO' }),
    );
  });
});
