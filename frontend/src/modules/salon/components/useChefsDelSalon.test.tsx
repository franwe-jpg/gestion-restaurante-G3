import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listarChefs } from '../api';
import type { Chef } from '../types';

import { useChefsDelSalon } from './useChefsDelSalon';

vi.mock('../api');

const CHEF: Chef = {
  id: 4,
  dni: '28111222',
  nombre: 'Marta',
  apellido: 'Gómez',
  telefono: null,
  estado: 'HABILITADO',
  correo: 'marta@resto.com',
};

afterEach(() => {
  vi.resetAllMocks();
});

describe('useChefsDelSalon', () => {
  it('consulta la primera página con limit 50 y offset 0', async () => {
    vi.mocked(listarChefs).mockResolvedValue({
      datos: { items: [CHEF], total: 1, limit: 50, offset: 0 },
      exito: true,
    });

    const { result } = renderHook(() => useChefsDelSalon());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(listarChefs).toHaveBeenCalledWith(50, 0);
    expect(result.current.chefs).toEqual([CHEF]);
    expect(result.current.error).toBeNull();
  });

  it('con más de 50 chefs informa más de una página', async () => {
    vi.mocked(listarChefs).mockResolvedValue({
      datos: { items: [CHEF], total: 120, limit: 50, offset: 0 },
      exito: true,
    });

    const { result } = renderHook(() => useChefsDelSalon());

    await waitFor(() => expect(result.current.paginacion.totalPaginas).toBe(3));
  });

  it('expone el error del servidor y una lista vacía', async () => {
    vi.mocked(listarChefs).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No tiene permiso para realizar esta acción',
    });

    const { result } = renderHook(() => useChefsDelSalon());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBe('No tiene permiso para realizar esta acción');
    expect(result.current.chefs).toEqual([]);
  });

  it('vuelve a consultar cuando cambia el refresco', async () => {
    vi.mocked(listarChefs).mockResolvedValue({
      datos: { items: [CHEF], total: 1, limit: 50, offset: 0 },
      exito: true,
    });

    const { result, rerender } = renderHook(({ refresco }) => useChefsDelSalon(refresco), {
      initialProps: { refresco: 0 },
    });
    await waitFor(() => expect(result.current.cargando).toBe(false));
    rerender({ refresco: 1 });

    await waitFor(() => expect(listarChefs).toHaveBeenCalledTimes(2));
  });
});
