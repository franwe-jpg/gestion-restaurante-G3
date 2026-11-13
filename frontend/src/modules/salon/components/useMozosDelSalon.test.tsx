import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listarMozos } from '../api';
import type { Mozo } from '../types';

import { useMozosDelSalon } from './useMozosDelSalon';

vi.mock('../api');

const MOZO: Mozo = {
  id: 1,
  dni: '30123456',
  nombre: 'Juan',
  apellido: 'Fernández',
  telefono: null,
  estado: 'HABILITADO',
  correo: 'juan@resto.com',
};

function pagina(items: Mozo[], total: number) {
  return { datos: { items, total, limit: 50, offset: 0 }, exito: true };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useMozosDelSalon', () => {
  it('consulta la primera página con limit 50 y offset 0 (CA 1 de #46)', async () => {
    vi.mocked(listarMozos).mockResolvedValue(pagina([MOZO], 1));

    const { result } = renderHook(() => useMozosDelSalon());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(listarMozos).toHaveBeenCalledWith(50, 0);
    expect(result.current.mozos).toEqual([MOZO]);
    expect(result.current.error).toBeNull();
  });

  it('sincroniza el total con la paginación', async () => {
    vi.mocked(listarMozos).mockResolvedValue(pagina([MOZO], 120));

    const { result } = renderHook(() => useMozosDelSalon());

    await waitFor(() => expect(result.current.paginacion.totalPaginas).toBe(3));
  });

  it('recargar vuelve a consultar', async () => {
    vi.mocked(listarMozos).mockResolvedValue(pagina([MOZO], 1));
    const { result } = renderHook(() => useMozosDelSalon());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.recargar());

    await waitFor(() => expect(listarMozos).toHaveBeenCalledTimes(2));
  });

  it('con otro valor de refresco vuelve a consultar (escenario Mozo creado)', async () => {
    vi.mocked(listarMozos).mockResolvedValue(pagina([MOZO], 1));
    const { result, rerender } = renderHook(({ refresco }) => useMozosDelSalon(refresco), {
      initialProps: { refresco: 0 },
    });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    rerender({ refresco: 1 });

    await waitFor(() => expect(listarMozos).toHaveBeenCalledTimes(2));
  });

  it('al cambiar de página consulta el offset correspondiente', async () => {
    vi.mocked(listarMozos).mockResolvedValue(pagina([MOZO], 120));
    const { result } = renderHook(() => useMozosDelSalon());
    await waitFor(() => expect(result.current.paginacion.totalPaginas).toBe(3));

    act(() => result.current.paginacion.irAPagina(2));

    await waitFor(() => expect(listarMozos).toHaveBeenCalledWith(50, 50));
  });

  it('expone el error de la consulta', async () => {
    vi.mocked(listarMozos).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });

    const { result } = renderHook(() => useMozosDelSalon());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBe('No se pudo conectar con el backend');
    expect(result.current.mozos).toEqual([]);
  });
});
