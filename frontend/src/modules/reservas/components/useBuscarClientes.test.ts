import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Pagina, RespuestaApi } from '../../../shared/types';
import { buscarClientes } from '../api';
import type { ClienteEncontrado } from '../types';

import { useBuscarClientes } from './useBuscarClientes';

vi.mock('../api');

type Respuesta = RespuestaApi<Pagina<ClienteEncontrado>>;

const ANA: ClienteEncontrado = { id: 7, nombre: 'Ana Pérez', telefono: '+54 280 1234567' };
const ANDRES: ClienteEncontrado = { id: 8, nombre: 'Andrés Gil', telefono: '280-111' };

function conClientes(items: ClienteEncontrado[]): Respuesta {
  return { datos: { items, total: items.length, limit: 10, offset: 0 }, exito: true };
}

/** Un pedido que el test resuelve a mano, para controlar el orden en que llegan las respuestas. */
function pedidoPendiente() {
  let resolver: (respuesta: Respuesta) => void = () => undefined;
  const promesa = new Promise<Respuesta>((resolve) => (resolver = resolve));
  return { promesa, responder: (respuesta: Respuesta) => act(async () => resolver(respuesta)) };
}

/** Avanza el reloj simulado y deja que terminen las respuestas ya resueltas. */
async function pasar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('useBuscarClientes: sin texto', () => {
  it.each(['', '   '])('con «%s» queda inactivo y no pide nada', async (texto) => {
    const { result } = renderHook(() => useBuscarClientes(texto));
    await pasar(1000);

    expect(result.current).toEqual({ tipo: 'inactivo' });
    expect(buscarClientes).not.toHaveBeenCalled();
  });

  it('con un solo carácter ya busca', async () => {
    vi.mocked(buscarClientes).mockResolvedValue(conClientes([ANA]));
    renderHook(() => useBuscarClientes('A'));
    await pasar(300);

    expect(buscarClientes).toHaveBeenCalledWith('A');
  });
});

describe('useBuscarClientes: espera de 300 ms', () => {
  it('queda buscando, no pide antes de 300 ms y pide una sola vez después', async () => {
    vi.mocked(buscarClientes).mockResolvedValue(conClientes([ANA]));
    const { result } = renderHook(() => useBuscarClientes('Ana'));

    expect(result.current).toEqual({ tipo: 'buscando' });
    await pasar(299);
    expect(buscarClientes).not.toHaveBeenCalled();
    await pasar(1);

    expect(buscarClientes).toHaveBeenCalledTimes(1);
    expect(buscarClientes).toHaveBeenCalledWith('Ana');
    expect(result.current).toEqual({ tipo: 'listo', clientes: [ANA] });
  });

  it('las teclas seguidas dentro de los 300 ms hacen una sola llamada', async () => {
    vi.mocked(buscarClientes).mockResolvedValue(conClientes([ANA]));
    const { rerender } = renderHook(({ texto }) => useBuscarClientes(texto), {
      initialProps: { texto: 'A' },
    });
    await pasar(100);
    rerender({ texto: 'An' });
    await pasar(100);
    rerender({ texto: 'Ana' });
    await pasar(300);

    expect(buscarClientes).toHaveBeenCalledTimes(1);
    expect(buscarClientes).toHaveBeenCalledWith('Ana');
  });

  it('busca con el texto recortado', async () => {
    vi.mocked(buscarClientes).mockResolvedValue(conClientes([]));
    renderHook(() => useBuscarClientes('  Ana  '));
    await pasar(300);

    expect(buscarClientes).toHaveBeenCalledWith('Ana');
  });

  it('desmontar con la búsqueda pendiente no la ejecuta', async () => {
    const { unmount } = renderHook(() => useBuscarClientes('Ana'));
    unmount();
    await pasar(1000);

    expect(buscarClientes).not.toHaveBeenCalled();
  });
});

describe('useBuscarClientes: resultados', () => {
  it('queda listo con la lista vacía cuando nadie coincide', async () => {
    vi.mocked(buscarClientes).mockResolvedValue(conClientes([]));
    const { result } = renderHook(() => useBuscarClientes('Zzz'));
    await pasar(300);

    expect(result.current).toEqual({ tipo: 'listo', clientes: [] });
  });

  it('muestra el mensaje de la API cuando la búsqueda falla', async () => {
    vi.mocked(buscarClientes).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'Sin conexión',
    });
    const { result } = renderHook(() => useBuscarClientes('Ana'));
    await pasar(300);

    expect(result.current).toEqual({ tipo: 'error', mensaje: 'Sin conexión' });
  });

  it('usa un mensaje propio si la API no trae detalle', async () => {
    vi.mocked(buscarClientes).mockResolvedValue({ datos: null, exito: false });
    const { result } = renderHook(() => useBuscarClientes('Ana'));
    await pasar(300);

    expect(result.current).toEqual({
      tipo: 'error',
      mensaje: 'No se pudieron buscar los clientes.',
    });
  });

  it('una respuesta vieja no pisa a la nueva', async () => {
    const vieja = pedidoPendiente();
    const nueva = pedidoPendiente();
    vi.mocked(buscarClientes).mockReturnValueOnce(vieja.promesa).mockReturnValueOnce(nueva.promesa);
    const { result, rerender } = renderHook(({ texto }) => useBuscarClientes(texto), {
      initialProps: { texto: 'An' },
    });
    await pasar(300);
    rerender({ texto: 'Ana' });
    await pasar(300);

    await nueva.responder(conClientes([ANA]));
    await vieja.responder(conClientes([ANA, ANDRES]));

    expect(result.current).toEqual({ tipo: 'listo', clientes: [ANA] });
  });

  it('al cambiar el texto vuelve a buscando y no muestra la lista anterior', async () => {
    vi.mocked(buscarClientes).mockResolvedValue(conClientes([ANA]));
    const { result, rerender } = renderHook(({ texto }) => useBuscarClientes(texto), {
      initialProps: { texto: 'Ana' },
    });
    await pasar(300);
    rerender({ texto: 'Anas' });

    expect(result.current).toEqual({ tipo: 'buscando' });
  });
});
