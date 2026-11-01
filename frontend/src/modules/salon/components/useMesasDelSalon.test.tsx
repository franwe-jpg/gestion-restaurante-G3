import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listarMesas } from '../api';
import type { Mesa } from '../types';

import { useMesasDelSalon } from './useMesasDelSalon';

vi.mock('../api');

const MESA: Mesa = {
  id: 1,
  numero: 3,
  capacidad: 4,
  sector: { id: 1, nombre: 'Salón principal' },
  estado: 'LIBRE',
};

function pagina(items: Mesa[], total: number) {
  return { datos: { items, total, limit: 50, offset: 0 }, exito: true };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useMesasDelSalon', () => {
  it('consulta la primera página con limit 50 y offset 0 (CA 1 de #41)', async () => {
    vi.mocked(listarMesas).mockResolvedValue(pagina([MESA], 1));

    const { result } = renderHook(() => useMesasDelSalon());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(listarMesas).toHaveBeenCalledWith(50, 0);
    expect(result.current.mesas).toEqual([MESA]);
    expect(result.current.error).toBeNull();
  });

  it('sincroniza el total con la paginación', async () => {
    vi.mocked(listarMesas).mockResolvedValue(pagina([MESA], 120));

    const { result } = renderHook(() => useMesasDelSalon());

    await waitFor(() => expect(result.current.paginacion.totalPaginas).toBe(3));
  });

  it('recargar vuelve a consultar', async () => {
    vi.mocked(listarMesas).mockResolvedValue(pagina([MESA], 1));
    const { result } = renderHook(() => useMesasDelSalon());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.recargar());

    await waitFor(() => expect(listarMesas).toHaveBeenCalledTimes(2));
  });

  it('con otro valor de refresco vuelve a consultar (escenario Mesa creada)', async () => {
    vi.mocked(listarMesas).mockResolvedValue(pagina([MESA], 1));
    const { result, rerender } = renderHook(({ refresco }) => useMesasDelSalon(refresco), {
      initialProps: { refresco: 0 },
    });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    rerender({ refresco: 1 });

    await waitFor(() => expect(listarMesas).toHaveBeenCalledTimes(2));
  });

  it('al cambiar de página consulta el offset correspondiente', async () => {
    vi.mocked(listarMesas).mockResolvedValue(pagina([MESA], 120));
    const { result } = renderHook(() => useMesasDelSalon());
    await waitFor(() => expect(result.current.paginacion.totalPaginas).toBe(3));

    act(() => result.current.paginacion.irAPagina(2));

    await waitFor(() => expect(listarMesas).toHaveBeenCalledWith(50, 50));
  });

  it('expone el error de la consulta', async () => {
    vi.mocked(listarMesas).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });

    const { result } = renderHook(() => useMesasDelSalon());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBe('No se pudo conectar con el backend');
    expect(result.current.mesas).toEqual([]);
  });
});
