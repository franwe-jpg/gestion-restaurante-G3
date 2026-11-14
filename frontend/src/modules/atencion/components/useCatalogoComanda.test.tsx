import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import * as api from '../api';
import { useCatalogoComanda, useMozosHabilitados } from './useCatalogoComanda';

vi.mock('../api', () => ({
  listarMozosHabilitados: vi.fn(),
  listarMesas: vi.fn(),
  listarProductos: vi.fn(),
  listarMenusEjecutivos: vi.fn(),
}));

const pagina = <T,>(items: T[]) => ({
  exito: true,
  datos: { items, total: items.length, limit: 100, offset: 0 },
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.listarMesas).mockResolvedValue(
    pagina([{ id: 1, numero: 4, sector: { id: 1, nombre: 'Salón' }, estado: 'LIBRE' as const }]),
  );
  vi.mocked(api.listarProductos).mockResolvedValue(
    pagina([{ id: 11, nombre: 'Milanesa', precio: '9000.00', estado: 'HABILITADO' as const }]),
  );
  vi.mocked(api.listarMenusEjecutivos).mockResolvedValue(pagina([]));
  vi.mocked(api.listarMozosHabilitados).mockResolvedValue({
    exito: true,
    datos: [{ id: 31, nombre: 'Lucía', apellido: 'Paz', estado: 'HABILITADO' as const }],
  });
});

it('carga el catálogo y expone listas y nombres', async () => {
  const { result } = renderHook(() => useCatalogoComanda({ conMesas: true }));
  expect(result.current.cargando).toBe(true);
  await waitFor(() => expect(result.current.cargando).toBe(false));
  expect(result.current.error).toBeNull();
  expect(result.current.mesasLibres).toHaveLength(1);
  expect(result.current.productos).toHaveLength(1);
  expect(result.current.menus).toEqual([]);
  expect(result.current.nombreDe({ producto_id: 11, menu_ejecutivo_id: null, cantidad: 1 })).toBe(
    'Milanesa',
  );
});

it('informa el error y usa el respaldo para los nombres', async () => {
  vi.mocked(api.listarProductos).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'HTTP 500',
  });
  const { result } = renderHook(() => useCatalogoComanda());
  await waitFor(() => expect(result.current.cargando).toBe(false));
  expect(result.current.error).toBe('HTTP 500');
  expect(api.listarMesas).not.toHaveBeenCalled();
  expect(result.current.nombreDe({ producto_id: 11, menu_ejecutivo_id: null, cantidad: 1 })).toBe(
    'Producto #11',
  );
});

it('expone los mozos habilitados cuando se activa su catálogo', async () => {
  const { result } = renderHook(() => useCatalogoComanda({ conMozos: true }));
  await waitFor(() => expect(result.current.cargando).toBe(false));

  expect(api.listarMozosHabilitados).toHaveBeenCalledOnce();
  expect(result.current.mozos).toEqual([
    { id: 31, nombre: 'Lucía', apellido: 'Paz', estado: 'HABILITADO' },
  ]);
});

it('consulta por la búsqueda actual y devuelve las opciones filtradas', async () => {
  const { result } = renderHook(() => useMozosHabilitados('Lucía'));
  await waitFor(() => expect(result.current.cargando).toBe(false));

  expect(api.listarMozosHabilitados).toHaveBeenCalledWith('Lucía');
  expect(result.current.mozos.map((mozo) => mozo.id)).toEqual([31]);
  expect(result.current.error).toBeNull();
});

it('expone el error de M3 al buscar mozos', async () => {
  vi.mocked(api.listarMozosHabilitados).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'Error de búsqueda M3',
  });
  const { result } = renderHook(() => useMozosHabilitados('Lucía'));
  await waitFor(() => expect(result.current.cargando).toBe(false));

  expect(result.current.error).toBe('Error de búsqueda M3');
  expect(result.current.mozos).toEqual([]);
});
