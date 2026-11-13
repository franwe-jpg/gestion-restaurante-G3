import { afterEach, describe, expect, it, vi } from 'vitest';
import { clienteHttp } from '../../shared/api/client';
import * as api from './api';

afterEach(() => vi.restoreAllMocks());

it('lista usando filtros, estados S2-01 y paginación en /comandas', async () => {
  const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ exito: true, datos: null });
  await api.listarComandas({ mesa_id: 7, estado: 'ABIERTA', offset: 50, limit: 50 });
  expect(get).toHaveBeenCalledWith('/comandas?limit=50&offset=50&mesa_id=7&estado=ABIERTA');
});

it('consulta los pendientes antes de confirmar y cierra por una acción separada', async () => {
  const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ exito: true, datos: null });
  const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue({ exito: true, datos: null });
  await api.consultarPendientes(3);
  await api.cerrarComanda(3);
  expect(get).toHaveBeenCalledWith('/comandas/3/pendientes');
  expect(post).toHaveBeenCalledWith('/comandas/3/cerrar', {});
});

it('anula por POST de acción y conserva la respuesta HTTP', async () => {
  const respuesta = { exito: false, datos: null, error: 'Comanda facturada' };
  const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);
  expect(await api.anularComanda(3)).toBe(respuesta);
  expect(post).toHaveBeenCalledWith('/comandas/3/anular', {});
});

it('crea usando el cuerpo de entrada S2-01 sin importes ni fecha arbitrarios', async () => {
  const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue({ exito: true, datos: null });
  const datos = {
    mesa_id: 7,
    mozo_id: 31,
    detalles: [{ producto_id: 12, menu_ejecutivo_id: null, cantidad: 2 }],
    observaciones: null,
  };
  await api.crearComanda(datos);
  expect(post).toHaveBeenCalledWith('/comandas', datos);
});

it('consulta las entregas por GET /comandas/{id}/detalles', async () => {
  const respuesta = { exito: false, datos: null, error: 'La comanda 9 no existe' };
  const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);
  expect(await api.consultarEntregas(9)).toBe(respuesta);
  expect(get).toHaveBeenCalledWith('/comandas/9/detalles');
});

it('registra la cantidad entregada absoluta por PUT .../entrega', async () => {
  const respuesta = { exito: true, datos: { comanda_id: 3, estado: 'ABIERTA', detalles: [] } };
  const put = vi.spyOn(clienteHttp, 'put').mockResolvedValue(respuesta);
  expect(await api.registrarEntrega(3, 81, 4)).toBe(respuesta);
  expect(put).toHaveBeenCalledWith('/comandas/3/detalles/81/entrega', { cantidad_entregada: 4 });
});

it('marca la cantidad lista absoluta por PUT .../listo', async () => {
  const respuesta = { exito: true, datos: { comanda_id: 3, estado: 'ABIERTA', detalles: [] } };
  const put = vi.spyOn(clienteHttp, 'put').mockResolvedValue(respuesta);
  expect(await api.marcarListo(3, 81, 4)).toBe(respuesta);
  expect(put).toHaveBeenCalledWith('/comandas/3/detalles/81/listo', { cantidad_lista: 4 });
});

it('devuelve el error de la API al marcar listo sin lanzar', async () => {
  const error = { exito: false, datos: null, error: 'La línea ya se entregó por completo' };
  vi.spyOn(clienteHttp, 'put').mockResolvedValue(error);
  expect(await api.marcarListo(3, 81, 2)).toEqual(error);
});

describe('API de clientes', () => {
  it('consulta la primera página sin filtro', async () => {
    const respuesta = { exito: true, datos: { items: [], total: 0, limit: 50, offset: 0 } };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);
    expect(await api.listarClientes('', 50, 0)).toBe(respuesta);
    expect(get).toHaveBeenCalledWith('/clientes?limit=50&offset=0');
  });

  it('codifica el filtro y solicita el desplazamiento indicado', async () => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockResolvedValue({ exito: false, datos: null, error: 'Sin conexión' });
    expect(await api.listarClientes('+54 123', 10, 20)).toEqual({
      exito: false,
      datos: null,
      error: 'Sin conexión',
    });
    expect(get).toHaveBeenCalledWith('/clientes?q=%2B54+123&limit=10&offset=20');
  });

  it('envía ambos campos por PUT y conserva el error del servidor', async () => {
    const put = vi
      .spyOn(clienteHttp, 'put')
      .mockResolvedValue({ exito: false, datos: null, error: 'nombre inválido' });
    const datos = { nombre: 'Ana', telefono: '+54 123' };
    expect(await api.modificarCliente(7, datos)).toEqual({
      exito: false,
      datos: null,
      error: 'nombre inválido',
    });
    expect(put).toHaveBeenCalledWith('/clientes/7', datos);
  });
});

it('lista mesas, productos (todos) y menús con límite 100 para los selectores', async () => {
  const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ exito: true, datos: null });
  await api.listarMesas();
  await api.listarProductos();
  await api.listarMenusEjecutivos();
  expect(get).toHaveBeenCalledWith('/mesas?limit=100');
  expect(get).toHaveBeenCalledWith('/productos?estado=TODOS&limit=100');
  expect(get).toHaveBeenCalledWith('/menus-ejecutivos?limit=100');
});

it('agrega todas las páginas del listado público de mozos habilitados', async () => {
  const mozos = Array.from({ length: 100 }, (_, indice) => ({
    id: indice + 1,
    nombre: `Mozo ${indice + 1}`,
    apellido: 'Paz',
    estado: 'HABILITADO' as const,
  }));
  const get = vi
    .spyOn(clienteHttp, 'get')
    .mockResolvedValueOnce({
      exito: true,
      datos: { items: mozos, total: 101, limit: 100, offset: 0 },
    })
    .mockResolvedValueOnce({
      exito: true,
      datos: {
        items: [{ id: 101, nombre: 'Lucía', apellido: 'Ríos', estado: 'HABILITADO' }],
        total: 101,
        limit: 100,
        offset: 100,
      },
    });

  const respuesta = await api.listarMozosHabilitados();

  expect(respuesta.exito).toBe(true);
  expect(respuesta.datos).toHaveLength(101);
  expect(get.mock.calls.map(([ruta]) => ruta)).toEqual([
    '/mozos?estado=HABILITADO&limit=100&offset=0',
    '/mozos?estado=HABILITADO&limit=100&offset=100',
  ]);
});

it('consulta el listado público paginado sin filtro de estado para resolver nombres históricos', async () => {
  const mozo = { id: 4, nombre: 'Juan', apellido: 'Ríos', estado: 'DESHABILITADO' as const };
  const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({
    exito: true,
    datos: { items: [mozo], total: 1, limit: 100, offset: 0 },
  });

  const respuesta = await api.listarTodosMozos();

  expect(respuesta).toEqual({ exito: true, datos: [mozo] });
  expect(get).toHaveBeenCalledWith('/mozos?limit=100&offset=0');
});

it('envía la búsqueda al filtro paginado público de mozos habilitados', async () => {
  const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({
    exito: true,
    datos: { items: [], total: 0, limit: 100, offset: 0 },
  });

  await api.listarMozosHabilitados('Lucía Ríos');

  expect(get).toHaveBeenCalledWith(
    '/mozos?estado=HABILITADO&q=Luc%C3%ADa+R%C3%ADos&limit=100&offset=0',
  );
});
