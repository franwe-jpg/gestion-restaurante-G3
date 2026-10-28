import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import {
  crearMesa,
  crearSector,
  listarSectores,
  listarSectoresHabilitados,
  modificarSector,
} from './api';
import type { MesaCrear, Sector, SectorCrear, SectorModificar } from './types';

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

describe('listarSectoresHabilitados', () => {
  it('pide los sectores habilitados paginados para el selector (CA 1)', async () => {
    const sector: Sector = {
      id: 1,
      nombre: 'Salón principal',
      descripcion: null,
      estado: 'HABILITADO',
    };
    const respuesta = {
      datos: { items: [sector], total: 1, limit: 100, offset: 0 },
      exito: true,
    };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);

    const resultado = await listarSectoresHabilitados();

    expect(get).toHaveBeenCalledWith('/sectores?estado=HABILITADO&limit=100&offset=0');
    expect(resultado).toBe(respuesta);
  });
});

describe('modificarSector', () => {
  it('envía la modificación por PUT a /sectores/{id} (CA 1)', async () => {
    const datos: SectorModificar = { nombre: 'Salón central', descripcion: 'Planta alta' };
    const respuesta = {
      datos: {
        id: 3,
        nombre: 'Salón central',
        descripcion: 'Planta alta',
        estado: 'HABILITADO' as const,
      },
      exito: true,
    };
    const put = vi.spyOn(clienteHttp, 'put').mockResolvedValue(respuesta);

    const resultado = await modificarSector(3, datos);

    expect(put).toHaveBeenCalledWith('/sectores/3', datos);
    expect(resultado).toBe(respuesta);
  });

  it('envía la descripción nula cuando se borra (CA 1)', async () => {
    const put = vi
      .spyOn(clienteHttp, 'put')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await modificarSector(7, { nombre: 'Terraza', descripcion: null });

    expect(put).toHaveBeenCalledWith('/sectores/7', { nombre: 'Terraza', descripcion: null });
  });
});

describe('listarSectores', () => {
  it('pide todos los sectores paginados, sin filtro de estado (CA 1 de #36)', async () => {
    const sector: Sector = {
      id: 1,
      nombre: 'Salón principal',
      descripcion: null,
      estado: 'DESHABILITADO',
    };
    const respuesta = {
      datos: { items: [sector], total: 1, limit: 50, offset: 100 },
      exito: true,
    };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);

    const resultado = await listarSectores(50, 100);

    expect(get).toHaveBeenCalledWith('/sectores?limit=50&offset=100');
    expect(resultado).toBe(respuesta);
  });
});

describe('crearMesa', () => {
  it('envía el alta por POST a /mesas y devuelve la mesa creada (CA 1)', async () => {
    const datos: MesaCrear = { numero: 13, capacidad: 4, sector_id: 1 };
    const respuesta = {
      datos: {
        id: 1,
        numero: 13,
        capacidad: 4,
        sector: { id: 1, nombre: 'Salón principal' },
        estado: 'LIBRE' as const,
      },
      exito: true,
    };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

    const resultado = await crearMesa(datos);

    expect(post).toHaveBeenCalledWith('/mesas', datos);
    expect(resultado).toBe(respuesta);
  });
});
