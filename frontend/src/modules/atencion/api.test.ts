import { afterEach, expect, it, vi } from 'vitest';
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

it('crea usando el cuerpo de entrada S2-01 sin importes ni fecha arbitrarios', async () => {
  const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue({ exito: true, datos: null });
  const datos = {
    mesa_id: 7,
    detalles: [{ producto_id: 12, menu_ejecutivo_id: null, cantidad: 2 }],
    observaciones: null,
  };
  await api.crearComanda(datos);
  expect(post).toHaveBeenCalledWith('/comandas', datos);
});
