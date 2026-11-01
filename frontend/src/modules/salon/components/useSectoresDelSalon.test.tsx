import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listarSectores } from '../api';
import type { Sector } from '../types';

import { useSectoresDelSalon } from './useSectoresDelSalon';

vi.mock('../api');

const SALON: Sector = {
  id: 1,
  nombre: 'Salón principal',
  descripcion: null,
  estado: 'HABILITADO',
};

function pagina(items: Sector[], total: number) {
  return { datos: { items, total, limit: 50, offset: 0 }, exito: true };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useSectoresDelSalon', () => {
  it('consulta la primera página con limit 50 y offset 0 (CA 1 de #36)', async () => {
    vi.mocked(listarSectores).mockResolvedValue(pagina([SALON], 1));

    const { result } = renderHook(() => useSectoresDelSalon());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(listarSectores).toHaveBeenCalledWith(50, 0);
    expect(result.current.sectores).toEqual([SALON]);
    expect(result.current.error).toBeNull();
  });

  it('sincroniza el total con la paginación (CA 3 de #36)', async () => {
    vi.mocked(listarSectores).mockResolvedValue(pagina([SALON], 120));

    const { result } = renderHook(() => useSectoresDelSalon());

    await waitFor(() => expect(result.current.paginacion.totalPaginas).toBe(3));
  });

  it('recargar vuelve a consultar para reflejar la modificación (CA 1 de #34)', async () => {
    vi.mocked(listarSectores).mockResolvedValue(pagina([SALON], 1));
    const { result } = renderHook(() => useSectoresDelSalon());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.recargar());

    await waitFor(() => expect(listarSectores).toHaveBeenCalledTimes(2));
  });

  it('al cambiar de página consulta el offset correspondiente', async () => {
    vi.mocked(listarSectores).mockResolvedValue(pagina([SALON], 120));
    const { result } = renderHook(() => useSectoresDelSalon());
    await waitFor(() => expect(result.current.paginacion.totalPaginas).toBe(3));

    act(() => result.current.paginacion.irAPagina(2));

    await waitFor(() => expect(listarSectores).toHaveBeenCalledWith(50, 50));
  });

  it('expone el error de la consulta', async () => {
    vi.mocked(listarSectores).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });

    const { result } = renderHook(() => useSectoresDelSalon());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBe('No se pudo conectar con el backend');
    expect(result.current.sectores).toEqual([]);
  });
});
