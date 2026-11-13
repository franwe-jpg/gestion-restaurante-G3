import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastContext } from '../../../shared/components/ui/toast-context';
import { formatearMoneda } from '../../../shared/lib/format';
import type { RespuestaApi } from '../../../shared/types';
import {
  crearComandaDesdeReserva,
  listarMozosHabilitados,
  listarProductosHabilitados,
} from '../api';
import type { ComandaCreada, MozoSeleccionable, ProductoHabilitado, Reserva } from '../types';

import { ComandaDesdeReservaDialog } from './ComandaDesdeReservaDialog';

vi.mock('../api');

const MOZO: MozoSeleccionable = {
  id: 31,
  nombre: 'Lucía',
  apellido: 'Paz',
  estado: 'HABILITADO',
};
const OTRO_MOZO: MozoSeleccionable = {
  id: 32,
  nombre: 'Ana',
  apellido: 'Sosa',
  estado: 'HABILITADO',
};

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

/** Productos que ofrece la API simulada, ya ordenados por nombre como los entrega `api.ts`. */
const FLAN: ProductoHabilitado = { id: 13, nombre: 'Flan', precio: '800.00' };
const MILANESA: ProductoHabilitado = { id: 12, nombre: 'Milanesa', precio: '1500.50' };
const PRODUCTOS = [FLAN, MILANESA];

const ERROR_CANTIDAD = 'La cantidad debe ser un número entero mayor que cero';
const ERROR_PRODUCTO = 'Seleccione un producto';

const mostrarToast = vi.fn();

/** Abre el modal y deja que termine la carga simulada de productos. */
async function abrir(reserva: Reserva = RESERVA) {
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
  await asentar();
  return { onOpenChange, onCreada };
}

/** Escribe en un campo de texto, como «Cantidad 1». */
function escribir(etiqueta: string, valor: string) {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
}

/** Elige en el desplegable el producto que se llama así: lo busca por nombre, no por su ID. */
function elegir(etiqueta: string, nombre: string) {
  const opcion = within(screen.getByLabelText(etiqueta)).getByRole<HTMLOptionElement>('option', {
    name: new RegExp(`^${nombre} ·`),
  });
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: opcion.value } });
}

function guardar() {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comanda' }));
}

async function seleccionarMozo() {
  fireEvent.focus(screen.getByRole('combobox', { name: /Mozo/ }));
  await screen.findByRole('option', { name: 'Lucía Paz' });
  fireEvent.click(screen.getByRole('option', { name: 'Lucía Paz' }));
}

/** Deja que terminen las respuestas simuladas pendientes antes de seguir. */
async function asentar() {
  await act(async () => undefined);
}

/** Pulsa «Agregar producto» y deja las dos líneas: Milanesa por 2 y Flan por 1. */
function llenarDosLineas() {
  fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
  elegir('Producto 1', 'Milanesa');
  escribir('Cantidad 1', '2');
  elegir('Producto 2', 'Flan');
}

/** Textos de las opciones de un desplegable, en el orden en que se ofrecen. */
function textosDeOpciones(etiqueta: string) {
  return within(screen.getByLabelText(etiqueta))
    .queryAllByRole('option')
    .map((opcion) => opcion.textContent);
}

/** Avisos de error (`role="alert"`) con ese texto; las opciones de un desplegable no cuentan. */
function avisosCon(mensaje: string, contenedor: HTMLElement = document.body) {
  return within(contenedor)
    .queryAllByRole('alert')
    .filter((aviso) => aviso.textContent === mensaje);
}

/** El mensaje de error debe verse dentro del mismo bloque del campo, bajo el campo. */
function errorBajo(etiqueta: string, mensaje: string) {
  const bloque = screen.getByLabelText(etiqueta).parentElement!;
  return avisosCon(mensaje, bloque)[0] ?? null;
}

beforeEach(() => {
  vi.mocked(listarProductosHabilitados).mockResolvedValue({ datos: PRODUCTOS, exito: true });
});

afterEach(() => {
  vi.resetAllMocks();
});

beforeEach(() => {
  vi.mocked(listarMozosHabilitados).mockResolvedValue({
    exito: true,
    datos: [MOZO, OTRO_MOZO],
  });
});

describe('ComandaDesdeReservaDialog: contenido inicial', () => {
  it('muestra el título, mesa, selector de mozo obligatorio, una línea sin producto y los botones', async () => {
    await abrir();
    fireEvent.focus(screen.getByRole('combobox', { name: /Mozo/ }));
    await screen.findByRole('option', { name: 'Lucía Paz' });

    expect(screen.getByRole('dialog', { name: 'Crear comanda' })).toBeInTheDocument();
    expect(screen.getByLabelText('Mesa')).toHaveValue('Mesa n.º 5');
    expect(screen.getByRole('combobox', { name: /Mozo/ })).toBeRequired();
    expect(screen.getByRole('combobox', { name: /Mozo/ })).toHaveValue('');
    expect(screen.getByLabelText('Producto 1')).toHaveValue('');
    expect(screen.getByLabelText('Cantidad 1')).toHaveValue('1');
    expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeDisabled();
  });

  it('el producto se elige en un desplegable: ya no hay una caja para escribir el ID', async () => {
    await abrir();

    expect(screen.getByLabelText('Producto 1').tagName).toBe('SELECT');
    expect(screen.queryByLabelText('Producto 1 (ID)')).toBeNull();
    expect(screen.queryByLabelText(/\(ID\)/)).toBeNull();
  });

  it('muestra la mesa de la reserva que recibe, no una fija', async () => {
    await abrir({ ...RESERVA, id: 11, mesa_id: 6 });

    expect(screen.getByLabelText('Mesa')).toHaveValue('Mesa n.º 6');
  });

  it('la mesa es un campo de solo lectura: deshabilitado y el valor no cambia', async () => {
    await abrir();
    const mesa = screen.getByLabelText('Mesa');

    fireEvent.change(mesa, { target: { value: 'Mesa n.º 9' } });

    expect(mesa.tagName).toBe('INPUT');
    expect(mesa).toBeDisabled();
    expect(mesa).toHaveValue('Mesa n.º 5');
  });

  it('no pide observaciones', async () => {
    await abrir();

    expect(screen.queryByLabelText(/observaciones/i)).toBeNull();
  });
});

describe('ComandaDesdeReservaDialog: lista de productos', () => {
  it('ofrece los productos habilitados por su nombre y su precio', async () => {
    await abrir();

    expect(textosDeOpciones('Producto 1')).toEqual([
      'Seleccione un producto',
      `Flan · ${formatearMoneda(800)}`,
      `Milanesa · ${formatearMoneda(1500.5)}`,
    ]);
    expect(screen.getByRole('option', { name: /^Milanesa/ }).textContent).toContain('1.500,50');
  });

  it('pide la lista una sola vez al abrir y la comparte entre todas las líneas', async () => {
    await abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    await asentar();

    expect(listarProductosHabilitados).toHaveBeenCalledTimes(1);
    expect(textosDeOpciones('Producto 2')).toEqual(textosDeOpciones('Producto 1'));
    expect(textosDeOpciones('Producto 3')).toEqual(textosDeOpciones('Producto 1'));
  });

  it('la elección de una línea no cambia la de otra', async () => {
    await abrir();
    llenarDosLineas();
    elegir('Producto 1', 'Flan');

    expect(screen.getByLabelText('Producto 1')).toHaveValue('13');
    expect(screen.getByLabelText('Producto 2')).toHaveValue('13');

    elegir('Producto 2', 'Milanesa');

    expect(screen.getByLabelText('Producto 1')).toHaveValue('13');
    expect(screen.getByLabelText('Producto 2')).toHaveValue('12');
  });
});

describe('ComandaDesdeReservaDialog: carga y lista vacía', () => {
  it('mientras carga muestra «Cargando productos…» y no se puede guardar; al llegar se habilita', async () => {
    let resolver: (respuesta: RespuestaApi<ProductoHabilitado[]>) => void = () => undefined;
    vi.mocked(listarProductosHabilitados).mockReturnValue(
      new Promise((resolve) => (resolver = resolve)),
    );
    await abrir();

    expect(textosDeOpciones('Producto 1')).toEqual(['Cargando productos…']);
    expect(screen.getByLabelText('Producto 1')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeDisabled();

    await act(async () => resolver({ datos: PRODUCTOS, exito: true }));
    await seleccionarMozo();

    expect(screen.getByLabelText('Producto 1')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeEnabled();
  });

  it('sin productos habilitados muestra «No hay productos habilitados» y no se puede guardar', async () => {
    vi.mocked(listarProductosHabilitados).mockResolvedValue({ datos: [], exito: true });

    await abrir();

    expect(textosDeOpciones('Producto 1')).toEqual(['No hay productos habilitados']);
    expect(screen.getByLabelText('Producto 1')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeDisabled();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('ComandaDesdeReservaDialog: error al cargar los productos', () => {
  beforeEach(() => {
    vi.mocked(listarProductosHabilitados).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'Error de conexión',
    });
  });

  it('muestra un aviso de error dentro del modal con el detalle y deja el modal abierto', async () => {
    const { onOpenChange } = await abrir();

    const aviso = screen.getByRole('alert');
    expect(aviso).toHaveClass('bg-danger-subtle');
    expect(within(aviso).getByText('No se pudieron cargar los productos')).toBeInTheDocument();
    expect(within(aviso).getByText('Error de conexión')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog', { name: 'Crear comanda' })).getByRole('alert')).toBe(
      aviso,
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('el desplegable queda deshabilitado y sin opciones', async () => {
    await abrir();

    expect(screen.getByLabelText('Producto 1')).toBeDisabled();
    expect(textosDeOpciones('Producto 1')).toEqual([]);
  });

  it('no permite enviar: ni el botón ni el envío del formulario llaman a la API', async () => {
    await abrir();
    const formulario = document.getElementById('formulario-comanda-desde-reserva');
    if (!(formulario instanceof HTMLFormElement)) throw new Error('No se encontró el formulario');

    expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeDisabled();
    fireEvent.submit(formulario);
    await asentar();

    expect(crearComandaDesdeReserva).not.toHaveBeenCalled();
  });

  it('sin detalle en la respuesta usa un mensaje propio', async () => {
    vi.mocked(listarProductosHabilitados).mockResolvedValue({ datos: null, exito: false });

    await abrir();

    expect(
      within(screen.getByRole('alert')).getByText(
        'No se pudo obtener la lista de productos habilitados.',
      ),
    ).toBeInTheDocument();
  });
});

describe('ComandaDesdeReservaDialog: agregar y quitar líneas', () => {
  it('«Agregar producto» suma la línea 2 y «Quitar producto 2» la elimina', async () => {
    await abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    expect(screen.getByLabelText('Producto 2')).toHaveValue('');
    expect(screen.getByLabelText('Cantidad 2')).toHaveValue('1');

    fireEvent.click(screen.getByRole('button', { name: 'Quitar producto 2' }));
    expect(screen.queryByLabelText('Producto 2')).toBeNull();
    expect(screen.queryByLabelText('Cantidad 2')).toBeNull();
  });

  it('con una sola línea «Quitar producto 1» no está disponible; con dos sí', async () => {
    await abrir();
    expect(screen.getByRole('button', { name: 'Quitar producto 1' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));

    expect(screen.getByRole('button', { name: 'Quitar producto 1' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Quitar producto 2' })).toBeEnabled();
  });

  it('quitar la primera de dos líneas deja la otra, renumerada y con lo que tenía elegido', async () => {
    await abrir();
    llenarDosLineas();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar producto 1' }));

    expect(screen.queryByLabelText('Producto 2')).toBeNull();
    expect(screen.getByLabelText('Producto 1')).toHaveValue('13');
    expect(screen.getByLabelText('Cantidad 1')).toHaveValue('1');
    expect(screen.getByRole('button', { name: 'Quitar producto 1' })).toBeDisabled();
  });
});

describe('ComandaDesdeReservaDialog: cerrar sin guardar', () => {
  it('«Cancelar» cierra el modal sin llamar a la API ni a onCreada', async () => {
    const { onOpenChange, onCreada } = await abrir();
    elegir('Producto 1', 'Milanesa');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(onCreada).not.toHaveBeenCalled();
    expect(crearComandaDesdeReserva).not.toHaveBeenCalled();
  });

  it('la X, la tecla Escape y el fondo también cierran sin llamar a la API', async () => {
    const { onOpenChange } = await abrir();

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
    const { onCreada } = await abrir();
    elegir('Producto 1', 'Milanesa');
    escribir('Cantidad 1', '0');
    await seleccionarMozo();

    guardar();
    await asentar();

    expect(errorBajo('Cantidad 1', ERROR_CANTIDAD)).toBeInTheDocument();
    expect(errorBajo('Producto 1', ERROR_PRODUCTO)).toBeNull();
    expect(crearComandaDesdeReserva).not.toHaveBeenCalled();
    expect(onCreada).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Crear comanda' })).toBeInTheDocument();
  });

  it('un producto sin elegir muestra «Seleccione un producto» bajo el campo y no llama a la API', async () => {
    await abrir();
    await seleccionarMozo();

    guardar();
    await asentar();

    expect(errorBajo('Producto 1', ERROR_PRODUCTO)).toBeInTheDocument();
    expect(errorBajo('Cantidad 1', ERROR_CANTIDAD)).toBeNull();
    expect(crearComandaDesdeReserva).not.toHaveBeenCalled();
  });

  it('con la línea 1 válida y la 2 con cantidad 0, el error aparece solo bajo «Cantidad 2»', async () => {
    await abrir();
    llenarDosLineas();
    escribir('Cantidad 2', '0');
    await seleccionarMozo();

    guardar();
    await asentar();

    expect(errorBajo('Cantidad 2', ERROR_CANTIDAD)).toBeInTheDocument();
    expect(avisosCon(ERROR_CANTIDAD)).toHaveLength(1);
    expect(avisosCon(ERROR_PRODUCTO)).toHaveLength(0);
    expect(crearComandaDesdeReserva).not.toHaveBeenCalled();
  });

  it('con la línea 2 sin producto, el error aparece solo bajo «Producto 2»', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    elegir('Producto 1', 'Milanesa');
    await seleccionarMozo();

    guardar();
    await asentar();

    expect(errorBajo('Producto 2', ERROR_PRODUCTO)).toBeInTheDocument();
    expect(avisosCon(ERROR_PRODUCTO)).toHaveLength(1);
    expect(crearComandaDesdeReserva).not.toHaveBeenCalled();
  });
});

describe('ComandaDesdeReservaDialog: selección del mozo', () => {
  it('filtra los mozos por nombre y el texto escrito no equivale a una selección', async () => {
    await abrir();
    const selector = screen.getByRole('combobox', { name: /Mozo/ });
    fireEvent.change(selector, { target: { value: 'Ana' } });

    expect(await screen.findByRole('option', { name: 'Ana Sosa' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Lucía Paz' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeDisabled();

    fireEvent.click(screen.getByRole('option', { name: 'Ana Sosa' }));

    expect(selector).toHaveValue('Ana Sosa');
    expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeEnabled();
  });

  it('no envía si no se seleccionó un mozo habilitado', async () => {
    await abrir();
    llenarDosLineas();
    fireEvent.focus(screen.getByRole('combobox', { name: /Mozo/ }));
    await screen.findByRole('option', { name: 'Lucía Paz' });

    fireEvent.submit(document.getElementById('formulario-comanda-desde-reserva')!);
    await asentar();

    expect(crearComandaDesdeReserva).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Seleccioná un mozo habilitado');
  });
});

describe('ComandaDesdeReservaDialog: envío con éxito', () => {
  it('con líneas válidas llama a la API con la reserva y los producto_id elegidos, avisa y llama a onCreada', async () => {
    vi.mocked(crearComandaDesdeReserva).mockResolvedValue({ datos: COMANDA, exito: true });
    const { onCreada } = await abrir();
    llenarDosLineas();
    await seleccionarMozo();

    guardar();
    await asentar();

    expect(crearComandaDesdeReserva).toHaveBeenCalledExactlyOnceWith(10, {
      mozo_id: 31,
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

  it('el cuerpo lleva el producto_id numérico de la opción elegida, no el texto del desplegable', async () => {
    vi.mocked(crearComandaDesdeReserva).mockResolvedValue({ datos: COMANDA, exito: true });
    await abrir();
    elegir('Producto 1', 'Flan');
    escribir('Cantidad 1', '3');
    await seleccionarMozo();

    guardar();
    await asentar();

    const cuerpo = vi.mocked(crearComandaDesdeReserva).mock.calls[0]?.[1];
    expect(cuerpo).toEqual({ mozo_id: 31, detalles: [{ producto_id: 13, cantidad: 3 }] });
    expect(typeof cuerpo?.detalles[0]?.producto_id).toBe('number');
  });
});

describe('ComandaDesdeReservaDialog: error del backend y solicitud en curso', () => {
  it('un error del backend se muestra en un aviso danger y el modal sigue con las líneas', async () => {
    vi.mocked(crearComandaDesdeReserva).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La reserva 10 ya fue atendida',
    });
    const { onOpenChange, onCreada } = await abrir();
    llenarDosLineas();
    await seleccionarMozo();

    guardar();
    await asentar();

    const aviso = screen.getByRole('alert');
    expect(aviso).toHaveClass('bg-danger-subtle');
    expect(within(aviso).getByText('No se pudo crear la comanda')).toBeInTheDocument();
    expect(within(aviso).getByText('La reserva 10 ya fue atendida')).toBeInTheDocument();
    expect(onCreada).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Crear comanda' })).toBeInTheDocument();
    expect(screen.getByLabelText('Producto 1')).toHaveValue('12');
    expect(screen.getByLabelText('Cantidad 1')).toHaveValue('2');
    expect(screen.getByLabelText('Producto 2')).toHaveValue('13');
    expect(screen.getByLabelText('Cantidad 2')).toHaveValue('1');
  });

  it('«Guardar comanda» queda deshabilitado mientras la solicitud está en curso', async () => {
    let resolver: (respuesta: RespuestaApi<ComandaCreada>) => void = () => undefined;
    vi.mocked(crearComandaDesdeReserva).mockReturnValue(
      new Promise((resolve) => (resolver = resolve)),
    );
    await abrir();
    elegir('Producto 1', 'Milanesa');
    await seleccionarMozo();

    guardar();
    await asentar();

    expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeDisabled();

    await act(async () => resolver({ datos: COMANDA, exito: true }));

    expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeEnabled();
    expect(crearComandaDesdeReserva).toHaveBeenCalledTimes(1);
  });
});
