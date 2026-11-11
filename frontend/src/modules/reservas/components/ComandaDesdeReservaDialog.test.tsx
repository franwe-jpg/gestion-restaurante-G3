import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastContext } from '../../../shared/components/ui/toast-context';
import type { RespuestaApi } from '../../../shared/types';
import { crearComandaDesdeReserva } from '../api';
import type { ComandaCreada, Reserva } from '../types';

import { ComandaDesdeReservaDialog } from './ComandaDesdeReservaDialog';

vi.mock('../api');

const RESERVA: Reserva = {
  id: 10,
  mesa_id: 5,
  cliente_id: 7,
  fecha: '2026-11-02',
  hora: '21:30',
  cantidad_personas: 4,
  estado: 'ACTIVA',
};

const COMANDA: ComandaCreada = { id: 31, mesa_id: 5, reserva_id: 10, estado: 'ABIERTA' };

const ERROR_CANTIDAD = 'La cantidad debe ser un número entero mayor que cero';
const ERROR_PRODUCTO = 'El producto debe ser un número entero mayor que cero';

const mostrarToast = vi.fn();

function abrir(reserva: Reserva = RESERVA) {
  const onOpenChange = vi.fn();
  const onCreada = vi.fn();
  render(
    <ToastContext.Provider value={{ mostrarToast }}>
      <ComandaDesdeReservaDialog
        reserva={reserva}
        onOpenChange={onOpenChange}
        onCreada={onCreada}
      />
    </ToastContext.Provider>,
  );
  return { onOpenChange, onCreada };
}

function escribir(etiqueta: string, valor: string) {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
}

function guardar() {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comanda' }));
}

/** Deja que terminen las respuestas simuladas pendientes antes de seguir. */
async function asentar() {
  await act(async () => undefined);
}

/** Pulsa «Agregar producto» y escribe las dos líneas: producto 12 por 2 y producto 13 por 1. */
function llenarDosLineas() {
  fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
  escribir('Producto 1 (ID)', '12');
  escribir('Cantidad 1', '2');
  escribir('Producto 2 (ID)', '13');
}

/** El mensaje de error debe verse dentro del mismo bloque del campo, bajo el campo. */
function errorBajo(etiqueta: string, mensaje: string) {
  const bloque = screen.getByLabelText(etiqueta).parentElement!;
  return within(bloque).queryByText(mensaje);
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('ComandaDesdeReservaDialog: contenido inicial', () => {
  it('muestra el título, la mesa de la reserva, una línea vacía y los botones', () => {
    abrir();

    expect(screen.getByRole('dialog', { name: 'Crear comanda' })).toBeInTheDocument();
    expect(screen.getByLabelText('Mesa')).toHaveValue('Mesa n.º 5');
    expect(screen.getByLabelText('Producto 1 (ID)')).toHaveValue('');
    expect(screen.getByLabelText('Cantidad 1')).toHaveValue('1');
    expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeEnabled();
  });

  it('muestra la mesa de la reserva que recibe, no una fija', () => {
    abrir({ ...RESERVA, id: 11, mesa_id: 6 });

    expect(screen.getByLabelText('Mesa')).toHaveValue('Mesa n.º 6');
  });

  it('la mesa es un campo de solo lectura: deshabilitado y el valor no cambia', () => {
    abrir();
    const mesa = screen.getByLabelText('Mesa');

    fireEvent.change(mesa, { target: { value: 'Mesa n.º 9' } });

    expect(mesa.tagName).toBe('INPUT');
    expect(mesa).toBeDisabled();
    expect(mesa).toHaveValue('Mesa n.º 5');
  });

  it('no pide observaciones', () => {
    abrir();

    expect(screen.queryByLabelText(/observaciones/i)).toBeNull();
  });
});

describe('ComandaDesdeReservaDialog: agregar y quitar líneas', () => {
  it('«Agregar producto» suma la línea 2 y «Quitar producto 2» la elimina', () => {
    abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    expect(screen.getByLabelText('Producto 2 (ID)')).toHaveValue('');
    expect(screen.getByLabelText('Cantidad 2')).toHaveValue('1');

    fireEvent.click(screen.getByRole('button', { name: 'Quitar producto 2' }));
    expect(screen.queryByLabelText('Producto 2 (ID)')).toBeNull();
    expect(screen.queryByLabelText('Cantidad 2')).toBeNull();
  });

  it('con una sola línea «Quitar producto 1» no está disponible; con dos sí', () => {
    abrir();
    expect(screen.getByRole('button', { name: 'Quitar producto 1' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));

    expect(screen.getByRole('button', { name: 'Quitar producto 1' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Quitar producto 2' })).toBeEnabled();
  });

  it('quitar la primera de dos líneas deja la otra, renumerada y con lo que tenía escrito', () => {
    abrir();
    llenarDosLineas();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar producto 1' }));

    expect(screen.queryByLabelText('Producto 2 (ID)')).toBeNull();
    expect(screen.getByLabelText('Producto 1 (ID)')).toHaveValue('13');
    expect(screen.getByLabelText('Cantidad 1')).toHaveValue('1');
    expect(screen.getByRole('button', { name: 'Quitar producto 1' })).toBeDisabled();
  });
});

describe('ComandaDesdeReservaDialog: cerrar sin guardar', () => {
  it('«Cancelar» cierra el modal sin llamar a la API ni a onCreada', () => {
    const { onOpenChange, onCreada } = abrir();
    escribir('Producto 1 (ID)', '12');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(onCreada).not.toHaveBeenCalled();
    expect(crearComandaDesdeReserva).not.toHaveBeenCalled();
  });

  it('la X, la tecla Escape y el fondo también cierran sin llamar a la API', () => {
    const { onOpenChange } = abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar modal' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    const fondo = document.querySelector('[aria-hidden="true"]');
    if (!(fondo instanceof HTMLElement)) throw new Error('No se encontró el fondo del modal');
    fireEvent.click(fondo);

    expect(onOpenChange).toHaveBeenCalledTimes(3);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(crearComandaDesdeReserva).not.toHaveBeenCalled();
  });
});

describe('ComandaDesdeReservaDialog: validación local', () => {
  it('una cantidad inválida muestra su error bajo el campo y no llama a la API', async () => {
    const { onCreada } = abrir();
    escribir('Producto 1 (ID)', '12');
    escribir('Cantidad 1', '0');

    guardar();
    await asentar();

    expect(errorBajo('Cantidad 1', ERROR_CANTIDAD)).toBeInTheDocument();
    expect(errorBajo('Producto 1 (ID)', ERROR_PRODUCTO)).toBeNull();
    expect(crearComandaDesdeReserva).not.toHaveBeenCalled();
    expect(onCreada).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Crear comanda' })).toBeInTheDocument();
  });

  it('un producto vacío muestra su error bajo el campo y no llama a la API', async () => {
    abrir();

    guardar();
    await asentar();

    expect(errorBajo('Producto 1 (ID)', ERROR_PRODUCTO)).toBeInTheDocument();
    expect(errorBajo('Cantidad 1', ERROR_CANTIDAD)).toBeNull();
    expect(crearComandaDesdeReserva).not.toHaveBeenCalled();
  });

  it('con la línea 1 válida y la 2 con cantidad 0, el error aparece solo bajo «Cantidad 2»', async () => {
    abrir();
    llenarDosLineas();
    escribir('Cantidad 2', '0');

    guardar();
    await asentar();

    expect(errorBajo('Cantidad 2', ERROR_CANTIDAD)).toBeInTheDocument();
    expect(screen.getAllByText(ERROR_CANTIDAD)).toHaveLength(1);
    expect(screen.queryByText(ERROR_PRODUCTO)).toBeNull();
    expect(crearComandaDesdeReserva).not.toHaveBeenCalled();
  });
});

describe('ComandaDesdeReservaDialog: envío con éxito', () => {
  it('con líneas válidas llama a la API con la reserva y las líneas, avisa y llama a onCreada', async () => {
    vi.mocked(crearComandaDesdeReserva).mockResolvedValue({ datos: COMANDA, exito: true });
    const { onCreada } = abrir();
    llenarDosLineas();

    guardar();
    await asentar();

    expect(crearComandaDesdeReserva).toHaveBeenCalledExactlyOnceWith(10, {
      detalles: [
        { producto_id: 12, cantidad: 2 },
        { producto_id: 13, cantidad: 1 },
      ],
    });
    expect(mostrarToast).toHaveBeenCalledExactlyOnceWith({
      titulo: 'Comanda n.º 31 creada',
      variante: 'success',
    });
    expect(onCreada).toHaveBeenCalledTimes(1);
  });
});

describe('ComandaDesdeReservaDialog: error del backend y solicitud en curso', () => {
  it('un error del backend se muestra en un aviso danger y el modal sigue con las líneas', async () => {
    vi.mocked(crearComandaDesdeReserva).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La reserva 10 ya fue atendida',
    });
    const { onOpenChange, onCreada } = abrir();
    llenarDosLineas();

    guardar();
    await asentar();

    const aviso = screen.getByRole('alert');
    expect(aviso).toHaveClass('bg-danger-subtle');
    expect(within(aviso).getByText('No se pudo crear la comanda')).toBeInTheDocument();
    expect(within(aviso).getByText('La reserva 10 ya fue atendida')).toBeInTheDocument();
    expect(onCreada).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Crear comanda' })).toBeInTheDocument();
    expect(screen.getByLabelText('Producto 1 (ID)')).toHaveValue('12');
    expect(screen.getByLabelText('Cantidad 1')).toHaveValue('2');
    expect(screen.getByLabelText('Producto 2 (ID)')).toHaveValue('13');
    expect(screen.getByLabelText('Cantidad 2')).toHaveValue('1');
  });

  it('«Guardar comanda» queda deshabilitado mientras la solicitud está en curso', async () => {
    let resolver: (respuesta: RespuestaApi<ComandaCreada>) => void = () => undefined;
    vi.mocked(crearComandaDesdeReserva).mockReturnValue(
      new Promise((resolve) => (resolver = resolve)),
    );
    abrir();
    escribir('Producto 1 (ID)', '12');

    guardar();
    await asentar();

    expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeDisabled();

    await act(async () => resolver({ datos: COMANDA, exito: true }));

    expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeEnabled();
    expect(crearComandaDesdeReserva).toHaveBeenCalledTimes(1);
  });
});
