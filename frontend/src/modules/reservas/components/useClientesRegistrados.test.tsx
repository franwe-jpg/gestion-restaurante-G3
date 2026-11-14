import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Pagina, RespuestaApi } from '../../../shared/types';
import { listarClientes } from '../api';
import type { ClienteEncontrado } from '../types';

import { useClientesRegistrados } from './useClientesRegistrados';

vi.mock('../api');

type Respuesta = RespuestaApi<Pagina<ClienteEncontrado>>;

const ZOE: ClienteEncontrado = { id: 3, nombre: 'Zoe Ruiz', telefono: '280-333' };
const ANA: ClienteEncontrado = { id: 7, nombre: 'Ana Pérez', telefono: '+54 280 1234567' };
const BETO: ClienteEncontrado = { id: 9, nombre: 'Beto Díaz', telefono: '280-999' };

function conClientes(items: ClienteEncontrado[], total = items.length): Respuesta {
  return { datos: { items, total, limit: 100, offset: 0 }, exito: true };
}

/** Un pedido que el test resuelve a mano, para controlar cuándo llega la respuesta. */
function pedidoPendiente() {
  let resolver: (respuesta: Respuesta) => void = () => undefined;
  const promesa = new Promise<Respuesta>((resolve) => (resolver = resolve));
  return { promesa, responder: (respuesta: Respuesta) => act(async () => resolver(respuesta)) };
}

function montar(habilitado = true) {
  return renderHook(({ activo }) => useClientesRegistrados(activo), {
    initialProps: { activo: habilitado },
  });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useClientesRegistrados: sin habilitar', () => {
  it('deshabilitado no pide nada y no queda cargando', async () => {
    const { result } = montar(false);
    await act(async () => undefined);

    expect(listarClientes).not.toHaveBeenCalled();
    expect(result.current).toEqual({ clientes: [], total: 0, cargando: false, error: undefined });
  });
});

describe('useClientesRegistrados: carga', () => {
  it('queda cargando hasta que llega la respuesta y pide la lista una sola vez', async () => {
    const pedido = pedidoPendiente();
    vi.mocked(listarClientes).mockReturnValue(pedido.promesa);
    const { result } = montar();

    expect(result.current).toEqual({ clientes: [], total: 0, cargando: true, error: undefined });
    await pedido.responder(conClientes([ANA]));

    expect(result.current).toEqual({
      clientes: [ANA],
      total: 1,
      cargando: false,
      error: undefined,
    });
    expect(listarClientes).toHaveBeenCalledTimes(1);
  });

  it('ordena los clientes por nombre, con las reglas del español', async () => {
    const alvaro = { id: 11, nombre: 'Álvaro Gil', telefono: '280-1' };
    vi.mocked(listarClientes).mockResolvedValue(conClientes([ZOE, ANA, alvaro, BETO]));
    const { result } = montar();

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.clientes).toEqual([alvaro, ANA, BETO, ZOE]);
  });

  it('con el mismo nombre ordena por número de cliente', async () => {
    const otraAna = { ...ANA, id: 2 };
    vi.mocked(listarClientes).mockResolvedValue(conClientes([ANA, otraAna]));
    const { result } = montar();

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.clientes).toEqual([otraAna, ANA]);
  });

  it('no modifica la lista que devolvió la API al ordenarla', async () => {
    const items = [ZOE, ANA];
    vi.mocked(listarClientes).mockResolvedValue(conClientes(items));
    const { result } = montar();

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(items).toEqual([ZOE, ANA]);
  });

  it('con la lista vacía queda listo, sin clientes ni error', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conClientes([]));
    const { result } = montar();

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current).toEqual({ clientes: [], total: 0, cargando: false, error: undefined });
  });

  it('con más clientes que los recibidos informa el total de la API', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conClientes([ANA, BETO], 130));
    const { result } = montar();

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.clientes).toHaveLength(2);
    expect(result.current.total).toBe(130);
  });
});

describe('useClientesRegistrados: error', () => {
  it('muestra el mensaje de la API y no ofrece clientes', async () => {
    vi.mocked(listarClientes).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'Sin permiso',
    });
    const { result } = montar();

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current).toEqual({
      clientes: [],
      total: 0,
      cargando: false,
      error: 'Sin permiso',
    });
  });

  it('usa un mensaje propio si la API no trae detalle', async () => {
    vi.mocked(listarClientes).mockResolvedValue({ datos: null, exito: false });
    const { result } = montar();

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.error).toBe('No se pudieron cargar los clientes registrados.');
  });
});

describe('useClientesRegistrados: habilitar y deshabilitar', () => {
  it('una vez cargada la lista no la pide de nuevo al deshabilitar y volver a habilitar', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conClientes([ANA]));
    const { result, rerender } = montar();
    await waitFor(() => expect(result.current.cargando).toBe(false));

    rerender({ activo: false });
    rerender({ activo: true });
    await act(async () => undefined);

    expect(listarClientes).toHaveBeenCalledTimes(1);
    expect(result.current.clientes).toEqual([ANA]);
  });

  it('una respuesta que llega con el hook deshabilitado se descarta y la lista se pide otra vez', async () => {
    const vieja = pedidoPendiente();
    const nueva = pedidoPendiente();
    vi.mocked(listarClientes).mockReturnValueOnce(vieja.promesa).mockReturnValueOnce(nueva.promesa);
    const { result, rerender } = montar();

    rerender({ activo: false });
    await vieja.responder(conClientes([ZOE]));
    expect(result.current).toEqual({ clientes: [], total: 0, cargando: false, error: undefined });
    rerender({ activo: true });
    await nueva.responder(conClientes([ANA]));

    expect(listarClientes).toHaveBeenCalledTimes(2);
    expect(result.current.clientes).toEqual([ANA]);
  });

  it('una respuesta que llega después de desmontar no rompe nada', async () => {
    const pedido = pedidoPendiente();
    vi.mocked(listarClientes).mockReturnValue(pedido.promesa);
    const errores = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { unmount } = montar();

    unmount();
    await pedido.responder(conClientes([ANA]));

    expect(errores).not.toHaveBeenCalled();
    errores.mockRestore();
  });
});
