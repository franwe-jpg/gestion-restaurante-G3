import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { RespuestaApi } from '../types';

import { useApi } from './useApi';

describe('useApi', () => {
  it('carga los datos y permite recargar', async () => {
    let llamadas = 0;
    const consulta = vi.fn(async () => {
      llamadas += 1;
      return { datos: { valor: llamadas }, exito: true } as RespuestaApi<{ valor: number }>;
    });

    const { result } = renderHook(() => useApi(consulta, 'demo'));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.datos).toEqual({ valor: 1 });
    expect(result.current.error).toBeNull();

    act(() => result.current.recargar());

    await waitFor(() => expect(result.current.datos).toEqual({ valor: 2 }));
  });

  it('expone el error de la consulta', async () => {
    const consulta = vi.fn(async () => ({
      datos: null,
      exito: false,
      error: 'No se pudo cargar',
    }));

    const { result } = renderHook(() => useApi(consulta, 'demo'));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBe('No se pudo cargar');
  });
});
