import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RespuestaApi } from '../../../shared/types';
import { listarProductosHabilitados } from '../api';
import type { ProductoHabilitado } from '../types';

import { puedeElegirProducto, useProductosHabilitados } from './useProductosHabilitados';

vi.mock('../api');

type Respuesta = RespuestaApi<ProductoHabilitado[]>;

const MILANESA: ProductoHabilitado = { id: 12, nombre: 'Milanesa', precio: '1500.50' };
const FLAN: ProductoHabilitado = { id: 13, nombre: 'Flan', precio: '800.00' };

function conProductos(productos: ProductoHabilitado[]): Respuesta {
  return { datos: productos, exito: true };
}

/** Un pedido que el test resuelve a mano, para ver el estado mientras la lista viaja. */
function pedidoPendiente() {
  let resolver: (respuesta: Respuesta) => void = () => undefined;
  const promesa = new Promise<Respuesta>((resolve) => (resolver = resolve));
  return { promesa, responder: (respuesta: Respuesta) => act(async () => resolver(respuesta)) };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useProductosHabilitados: carga', () => {
  it('arranca cargando y llega a listo con los productos que devuelve la API', async () => {
    const pedido = pedidoPendiente();
    vi.mocked(listarProductosHabilitados).mockReturnValue(pedido.promesa);

    const { result } = renderHook(() => useProductosHabilitados());

    expect(result.current).toEqual({ tipo: 'cargando' });
    await pedido.responder(conProductos([FLAN, MILANESA]));
    expect(result.current).toEqual({ tipo: 'listo', productos: [FLAN, MILANESA] });
  });

  it('si no hay productos habilitados queda listo con una lista vacía', async () => {
    vi.mocked(listarProductosHabilitados).mockResolvedValue(conProductos([]));

    const { result } = renderHook(() => useProductosHabilitados());

    await waitFor(() => expect(result.current).toEqual({ tipo: 'listo', productos: [] }));
  });

  it('una respuesta exitosa sin datos queda como lista vacía', async () => {
    vi.mocked(listarProductosHabilitados).mockResolvedValue({ datos: null, exito: true });

    const { result } = renderHook(() => useProductosHabilitados());

    await waitFor(() => expect(result.current).toEqual({ tipo: 'listo', productos: [] }));
  });
});

describe('useProductosHabilitados: error', () => {
  it('si la carga falla queda en error con el detalle de la API', async () => {
    vi.mocked(listarProductosHabilitados).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'Error de conexión',
    });

    const { result } = renderHook(() => useProductosHabilitados());

    await waitFor(() =>
      expect(result.current).toEqual({ tipo: 'error', mensaje: 'Error de conexión' }),
    );
  });

  it('si la carga falla sin detalle queda en error con un mensaje propio', async () => {
    vi.mocked(listarProductosHabilitados).mockResolvedValue({ datos: null, exito: false });

    const { result } = renderHook(() => useProductosHabilitados());

    await waitFor(() =>
      expect(result.current).toEqual({
        tipo: 'error',
        mensaje: 'No se pudo obtener la lista de productos habilitados.',
      }),
    );
  });
});

describe('useProductosHabilitados: una sola carga', () => {
  it('pide la lista una sola vez al montarse, aunque el componente se vuelva a pintar', async () => {
    vi.mocked(listarProductosHabilitados).mockResolvedValue(conProductos([MILANESA]));

    const { result, rerender } = renderHook(() => useProductosHabilitados());
    await waitFor(() => expect(result.current.tipo).toBe('listo'));
    rerender();
    rerender();

    expect(listarProductosHabilitados).toHaveBeenCalledTimes(1);
  });

  it('una respuesta que llega con el componente ya desmontado no cambia nada ni falla', async () => {
    const pedido = pedidoPendiente();
    vi.mocked(listarProductosHabilitados).mockReturnValue(pedido.promesa);
    const { result, unmount } = renderHook(() => useProductosHabilitados());

    unmount();
    await pedido.responder(conProductos([MILANESA]));

    expect(result.current).toEqual({ tipo: 'cargando' });
  });
});

describe('puedeElegirProducto', () => {
  it('solo es verdadero con la lista lista y con al menos un producto', () => {
    expect(puedeElegirProducto({ tipo: 'cargando' })).toBe(false);
    expect(puedeElegirProducto({ tipo: 'error', mensaje: 'Falló' })).toBe(false);
    expect(puedeElegirProducto({ tipo: 'listo', productos: [] })).toBe(false);
    expect(puedeElegirProducto({ tipo: 'listo', productos: [MILANESA] })).toBe(true);
  });
});
