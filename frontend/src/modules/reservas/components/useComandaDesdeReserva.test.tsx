import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastContext } from '../../../shared/components/ui/toast-context';
import type { RespuestaApi } from '../../../shared/types';
import { crearComandaDesdeReserva } from '../api';
import type { ComandaCreada } from '../types';

import { useComandaDesdeReserva } from './useComandaDesdeReserva';

vi.mock('../api');

const RESERVA = { id: 10 };
const COMANDA: ComandaCreada = { id: 31, mesa_id: 5, reserva_id: 10, estado: 'ABIERTA' };

const mostrarToast = vi.fn();

function preparar() {
  const onCreada = vi.fn();
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
  );
  const { result, unmount } = renderHook(
    () => useComandaDesdeReserva({ reserva: RESERVA, onCreada }),
    {
      wrapper: envoltorio,
    },
  );
  return { result, unmount, onCreada };
}

type Hook = ReturnType<typeof preparar>['result'];

/** Escribe producto y cantidad en la línea que ocupa ese lugar. */
function escribir(result: Hook, indice: number, producto: string, cantidad: string) {
  const clave = result.current.lineas[indice]!.clave;
  act(() => {
    result.current.cambiarLinea(clave, 'producto', producto);
    result.current.cambiarLinea(clave, 'cantidad', cantidad);
  });
}

/** Deja dos líneas válidas: producto 12 por 2 y producto 13 por 1. */
function llenarDosLineas(result: Hook) {
  escribir(result, 0, '12', '2');
  act(() => result.current.agregarLinea());
  escribir(result, 1, '13', '1');
}

function exito(): RespuestaApi<ComandaCreada> {
  return { datos: COMANDA, exito: true };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useComandaDesdeReserva: líneas', () => {
  it('arranca con una línea de producto vacío y cantidad 1', () => {
    const { result } = preparar();

    expect(result.current.lineas).toEqual([
      { clave: expect.any(Number), producto: '', cantidad: '1' },
    ]);
    expect(result.current.errores).toEqual({ lineas: {} });
    expect(result.current.enviando).toBe(false);
  });

  it('agregarLinea suma una línea nueva con otra clave, vacía y con cantidad 1', () => {
    const { result } = preparar();

    act(() => result.current.agregarLinea());

    expect(result.current.lineas).toHaveLength(2);
    const [primera, segunda] = result.current.lineas;
    expect(segunda).toEqual({ clave: expect.any(Number), producto: '', cantidad: '1' });
    expect(segunda!.clave).not.toBe(primera!.clave);
  });

  it('cambiarLinea modifica solo el campo de esa línea', () => {
    const { result } = preparar();
    act(() => result.current.agregarLinea());

    escribir(result, 1, '13', '4');

    expect(result.current.lineas[0]).toMatchObject({ producto: '', cantidad: '1' });
    expect(result.current.lineas[1]).toMatchObject({ producto: '13', cantidad: '4' });
  });

  it('quitarLinea elimina esa línea y deja las demás', () => {
    const { result } = preparar();
    llenarDosLineas(result);
    const primera = result.current.lineas[0]!;

    act(() => result.current.quitarLinea(result.current.lineas[1]!.clave));

    expect(result.current.lineas).toEqual([primera]);
  });

  it('la última línea no se puede quitar', () => {
    const { result } = preparar();
    const unica = result.current.lineas[0]!;

    act(() => result.current.quitarLinea(unica.clave));

    expect(result.current.lineas).toEqual([unica]);
  });
});

describe('useComandaDesdeReserva: envío con éxito', () => {
  it('envía una línea por producto sin mesa ni observaciones, avisa y llama a onCreada', async () => {
    vi.mocked(crearComandaDesdeReserva).mockResolvedValue(exito());
    const { result, onCreada } = preparar();
    llenarDosLineas(result);

    await act(() => result.current.enviar());

    expect(crearComandaDesdeReserva).toHaveBeenCalledExactlyOnceWith(10, {
      detalles: [
        { producto_id: 12, cantidad: 2 },
        { producto_id: 13, cantidad: 1 },
      ],
    });
    const enviado = vi.mocked(crearComandaDesdeReserva).mock.calls[0]?.[1];
    expect(Object.keys(enviado ?? {})).toEqual(['detalles']);
    expect(mostrarToast).toHaveBeenCalledExactlyOnceWith({
      titulo: 'Comanda n.º 31 creada',
      variante: 'success',
    });
    expect(onCreada).toHaveBeenCalledTimes(1);
    expect(result.current.enviando).toBe(false);
  });
});

describe('useComandaDesdeReserva: error local', () => {
  it('con cantidad 0 no llama a la API ni a onCreada y deja el error en la línea', async () => {
    const { result, onCreada } = preparar();
    escribir(result, 0, '12', '0');
    const clave = result.current.lineas[0]!.clave;

    await act(() => result.current.enviar());

    expect(crearComandaDesdeReserva).not.toHaveBeenCalled();
    expect(onCreada).not.toHaveBeenCalled();
    expect(mostrarToast).not.toHaveBeenCalled();
    expect(result.current.errores.lineas[clave]).toEqual({
      cantidad: 'La cantidad debe ser un número entero mayor que cero',
    });
    expect(result.current.errores.general).toBeUndefined();
    expect(result.current.enviando).toBe(false);
  });

  it('sin producto elegido no llama a la API y deja «Seleccione un producto» en la línea', async () => {
    const { result, onCreada } = preparar();
    escribir(result, 0, '', '2');
    const clave = result.current.lineas[0]!.clave;

    await act(() => result.current.enviar());

    expect(crearComandaDesdeReserva).not.toHaveBeenCalled();
    expect(onCreada).not.toHaveBeenCalled();
    expect(result.current.errores.lineas[clave]).toEqual({ producto: 'Seleccione un producto' });
    expect(result.current.enviando).toBe(false);
  });

  it('limpia el error general anterior al volver a enviar', async () => {
    vi.mocked(crearComandaDesdeReserva).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La reserva 10 ya fue atendida',
    });
    const { result } = preparar();
    escribir(result, 0, '12', '2');
    await act(() => result.current.enviar());
    expect(result.current.errores.general).toBe('La reserva 10 ya fue atendida');

    escribir(result, 0, '12', '0');
    await act(() => result.current.enviar());

    expect(result.current.errores.general).toBeUndefined();
  });
});

describe('useComandaDesdeReserva: error de la API', () => {
  it.each([
    ['404', 'La reserva 10 no existe'],
    ['409', 'La reserva 10 ya fue atendida'],
    ['422', 'La comanda debe incluir al menos un producto'],
  ])(
    'un %s deja el detalle como error general, sin onCreada y con las líneas escritas',
    async (_, detalle) => {
      vi.mocked(crearComandaDesdeReserva).mockResolvedValue({
        datos: null,
        exito: false,
        error: detalle,
      });
      const { result, onCreada } = preparar();
      llenarDosLineas(result);
      const escritas = result.current.lineas;

      await act(() => result.current.enviar());

      expect(result.current.errores.general).toBe(detalle);
      expect(result.current.errores.lineas).toEqual({});
      expect(onCreada).not.toHaveBeenCalled();
      expect(mostrarToast).not.toHaveBeenCalled();
      expect(result.current.lineas).toEqual(escritas);
      expect(result.current.enviando).toBe(false);
    },
  );

  it('sin detalle en la respuesta usa el título del aviso como error general', async () => {
    vi.mocked(crearComandaDesdeReserva).mockResolvedValue({ datos: null, exito: false });
    const { result } = preparar();
    escribir(result, 0, '12', '2');

    await act(() => result.current.enviar());

    expect(result.current.errores.general).toBe('No se pudo crear la comanda');
  });
});

describe('useComandaDesdeReserva: solicitud en curso', () => {
  it('enviando es true mientras viaja y un segundo enviar seguido no llama otra vez', async () => {
    let resolver: (respuesta: RespuestaApi<ComandaCreada>) => void = () => undefined;
    vi.mocked(crearComandaDesdeReserva).mockReturnValue(
      new Promise((resolve) => (resolver = resolve)),
    );
    const { result, onCreada } = preparar();
    escribir(result, 0, '12', '2');

    act(() => {
      void result.current.enviar();
      void result.current.enviar();
    });

    expect(result.current.enviando).toBe(true);
    expect(crearComandaDesdeReserva).toHaveBeenCalledTimes(1);

    await act(async () => resolver(exito()));

    expect(result.current.enviando).toBe(false);
    expect(onCreada).toHaveBeenCalledTimes(1);
  });

  it('si el modal se desmonta mientras viaja, la respuesta no avisa ni llama a onCreada (S38)', async () => {
    let resolver: (respuesta: RespuestaApi<ComandaCreada>) => void = () => undefined;
    vi.mocked(crearComandaDesdeReserva).mockReturnValue(
      new Promise((resolve) => (resolver = resolve)),
    );
    const { result, unmount, onCreada } = preparar();
    escribir(result, 0, '12', '2');
    act(() => {
      void result.current.enviar();
    });

    unmount();
    await act(async () => resolver(exito()));

    expect(mostrarToast).not.toHaveBeenCalled();
    expect(onCreada).not.toHaveBeenCalled();
  });
});
