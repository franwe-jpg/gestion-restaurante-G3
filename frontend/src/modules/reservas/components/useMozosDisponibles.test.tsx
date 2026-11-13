import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import { listarMozosHabilitados } from '../api';

import { useMozosDisponibles } from './useMozosDisponibles';

vi.mock('../api', () => ({ listarMozosHabilitados: vi.fn() }));

const MOZO = { id: 31, nombre: 'Lucía', apellido: 'Paz', estado: 'HABILITADO' as const };

beforeEach(() => {
  vi.resetAllMocks();
});

it('carga las opciones habilitadas', async () => {
  vi.mocked(listarMozosHabilitados).mockResolvedValue({ exito: true, datos: [MOZO] });
  const { result } = renderHook(() => useMozosDisponibles());

  await waitFor(() => expect(result.current.cargando).toBe(false));

  expect(result.current.mozos).toEqual([MOZO]);
  expect(result.current.error).toBeNull();
});

it('expone el error de la API para no habilitar una apertura sin catálogo', async () => {
  vi.mocked(listarMozosHabilitados).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'No se pudo cargar M3',
  });
  const { result } = renderHook(() => useMozosDisponibles());

  await waitFor(() => expect(result.current.cargando).toBe(false));

  expect(result.current.mozos).toEqual([]);
  expect(result.current.error).toBe('No se pudo cargar M3');
});

it('convierte un rechazo de red en un error visible', async () => {
  vi.mocked(listarMozosHabilitados).mockRejectedValue(new Error('Sin conexión'));
  const { result } = renderHook(() => useMozosDisponibles());

  await waitFor(() => expect(result.current.cargando).toBe(false));

  expect(result.current.error).toBe('Sin conexión');
});
