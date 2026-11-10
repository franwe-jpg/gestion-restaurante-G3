import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api';
import { cargarCatalogo, nombreDeDetalle } from './catalogoComanda';

vi.mock('../api', () => ({
  listarMesas: vi.fn(),
  listarProductos: vi.fn(),
  listarMenusEjecutivos: vi.fn(),
}));

const pagina = <T>(items: T[]) => ({
  exito: true,
  datos: { items, total: items.length, limit: 100, offset: 0 },
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.listarMesas).mockResolvedValue(
    pagina([
      { id: 1, numero: 4, sector: { id: 1, nombre: 'Salón' }, estado: 'LIBRE' },
      { id: 2, numero: 5, sector: { id: 1, nombre: 'Salón' }, estado: 'OCUPADA' },
      { id: 3, numero: 6, sector: { id: 1, nombre: 'Salón' }, estado: 'FUERA_DE_SERVICIO' },
    ]),
  );
  vi.mocked(api.listarProductos).mockResolvedValue(
    pagina([
      { id: 11, nombre: 'Milanesa', precio: '9000.00', estado: 'HABILITADO' },
      { id: 12, nombre: 'Flan', precio: '3000.00', estado: 'DESHABILITADO' },
    ]),
  );
  vi.mocked(api.listarMenusEjecutivos).mockResolvedValue(
    pagina([
      { id: 21, nombre: 'Menú del día', precio_fijo: '12000.00', estado: 'HABILITADO' },
      { id: 22, nombre: 'Menú viejo', precio_fijo: '10000.00', estado: 'DESHABILITADO' },
    ]),
  );
});

describe('cargarCatalogo', () => {
  it('filtra mesas libres y productos y menús habilitados', async () => {
    const r = await cargarCatalogo(true);
    expect(r.exito).toBe(true);
    expect(r.datos?.mesasLibres.map((m) => m.id)).toEqual([1]);
    expect(r.datos?.productos.map((p) => p.id)).toEqual([11]);
    expect(r.datos?.menus.map((m) => m.id)).toEqual([21]);
  });

  it('no pide mesas sin conMesas', async () => {
    const r = await cargarCatalogo(false);
    expect(api.listarMesas).not.toHaveBeenCalled();
    expect(r.datos?.mesasLibres).toEqual([]);
  });

  it('propaga el error de la primera lista que falla', async () => {
    vi.mocked(api.listarProductos).mockResolvedValue({
      exito: false,
      datos: null,
      error: 'HTTP 500',
    });
    const r = await cargarCatalogo(true);
    expect(r.exito).toBe(false);
    expect(r.error).toBe('HTTP 500');
  });
});

describe('nombreDeDetalle', () => {
  it('devuelve el nombre, incluso de deshabilitados, y el respaldo si falta', async () => {
    const { datos } = await cargarCatalogo(false);
    const todos = datos!;
    const det = (p: number | null, m: number | null) => ({
      producto_id: p,
      menu_ejecutivo_id: m,
      cantidad: 1,
    });
    expect(nombreDeDetalle(todos.nombres, det(11, null))).toBe('Milanesa');
    expect(nombreDeDetalle(todos.nombres, det(12, null))).toBe('Flan');
    expect(nombreDeDetalle(todos.nombres, det(null, 21))).toBe('Menú del día');
    expect(nombreDeDetalle(todos.nombres, det(99, null))).toBe('Producto #99');
    expect(nombreDeDetalle(todos.nombres, det(null, 98))).toBe('Menú #98');
  });
});
