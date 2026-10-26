import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import { crearSector } from './api';
import type { SectorCrear } from './types';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('crearSector', () => {
  it('envía el alta por POST a /sectores y devuelve el sector creado (CA 1)', async () => {
    const datos: SectorCrear = { nombre: 'Terraza', descripcion: 'Al aire libre' };
    const respuesta = {
      datos: {
        id: 1,
        nombre: 'Terraza',
        descripcion: 'Al aire libre',
        estado: 'HABILITADO' as const,
      },
      exito: true,
    };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

    const resultado = await crearSector(datos);

    expect(post).toHaveBeenCalledWith('/sectores', datos);
    expect(resultado).toBe(respuesta);
  });

  it('envía la descripción nula cuando no se carga (CA 1)', async () => {
    const post = vi
      .spyOn(clienteHttp, 'post')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await crearSector({ nombre: 'Salón principal', descripcion: null });

    expect(post).toHaveBeenCalledWith('/sectores', {
      nombre: 'Salón principal',
      descripcion: null,
    });
  });
});
