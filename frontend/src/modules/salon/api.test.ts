import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import {
  crearMesa,
  crearMozo,
  crearSector,
  eliminarMesa,
  eliminarMozo,
  eliminarSector,
  listarMesas,
  listarMozos,
  listarMozosDisponibles,
  listarSectores,
  listarSectoresHabilitados,
  modificarMesa,
  modificarMozo,
  modificarSector,
} from './api';
import type {
  MesaCrear,
  MesaModificar,
  Mozo,
  MozoCrear,
  MozoModificar,
  Sector,
  SectorCrear,
  SectorModificar,
} from './types';

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

describe('eliminarSector', () => {
  it('da de baja el sector con POST a /sectores/{id}/baja (CA 1 de #35)', async () => {
    const respuesta = {
      datos: { id: 2, nombre: 'Terraza', descripcion: null, estado: 'DESHABILITADO' as const },
      exito: true,
    };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

    const resultado = await eliminarSector(2);

    expect(post).toHaveBeenCalledWith('/sectores/2/baja', {});
    expect(resultado).toBe(respuesta);
  });
});

describe('listarMesas', () => {
  it('pide las mesas paginadas con sector y estado (CA 1 de #41)', async () => {
    const respuesta = {
      datos: {
        items: [
          {
            id: 1,
            numero: 3,
            capacidad: 4,
            sector: { id: 2, nombre: 'Terraza' },
            estado: 'LIBRE' as const,
          },
        ],
        total: 1,
        limit: 50,
        offset: 50,
      },
      exito: true,
    };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);

    const resultado = await listarMesas(50, 50);

    expect(get).toHaveBeenCalledWith('/mesas?limit=50&offset=50');
    expect(resultado).toBe(respuesta);
  });
});

describe('eliminarMesa', () => {
  it('borra la mesa con DELETE a /mesas/{id} (CA 1 de #37)', async () => {
    const respuesta = { datos: null, exito: true };
    const eliminar = vi.spyOn(clienteHttp, 'delete').mockResolvedValue(respuesta);

    const resultado = await eliminarMesa(4);

    expect(eliminar).toHaveBeenCalledWith('/mesas/4');
    expect(resultado).toBe(respuesta);
  });
});

describe('modificarMesa', () => {
  it('envía la modificación por PUT a /mesas/{id} (CA 1 de #39)', async () => {
    const datos: MesaModificar = { numero: 5, capacidad: 6, sector_id: 1 };
    const respuesta = {
      datos: {
        id: 3,
        numero: 5,
        capacidad: 6,
        sector: { id: 1, nombre: 'Salón principal' },
        estado: 'LIBRE' as const,
      },
      exito: true,
    };
    const put = vi.spyOn(clienteHttp, 'put').mockResolvedValue(respuesta);

    const resultado = await modificarMesa(3, datos);

    expect(put).toHaveBeenCalledWith('/mesas/3', datos);
    expect(resultado).toBe(respuesta);
  });
});

const MOZO: Mozo = {
  id: 1,
  dni: '30123456',
  nombre: 'Juan',
  apellido: 'Fernández',
  telefono: '280 412-3456',
  estado: 'HABILITADO',
};

describe('crearMozo', () => {
  it('envía el alta por POST a /mozos y devuelve el mozo creado (CA 1 de #43)', async () => {
    const datos: MozoCrear = {
      dni: '30123456',
      nombre: 'Juan',
      apellido: 'Fernández',
      telefono: '280 412-3456',
    };
    const respuesta = { datos: MOZO, exito: true };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

    const resultado = await crearMozo(datos);

    expect(post).toHaveBeenCalledWith('/mozos', datos);
    expect(resultado).toBe(respuesta);
  });
});

describe('modificarMozo', () => {
  it('envía la modificación por PUT a /mozos/{id} (CA 1 de #44)', async () => {
    const datos: MozoModificar = {
      dni: '35987654',
      nombre: 'Juan Carlos',
      apellido: 'Pérez',
      telefono: null,
    };
    const respuesta = { datos: { ...MOZO, ...datos }, exito: true };
    const put = vi.spyOn(clienteHttp, 'put').mockResolvedValue(respuesta);

    const resultado = await modificarMozo(1, datos);

    expect(put).toHaveBeenCalledWith('/mozos/1', datos);
    expect(resultado).toBe(respuesta);
  });
});

describe('listarMozos', () => {
  it('pide todos los mozos paginados, sin filtro de estado (CA 3 de #46)', async () => {
    const respuesta = {
      datos: { items: [MOZO], total: 1, limit: 50, offset: 50 },
      exito: true,
    };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);

    const resultado = await listarMozos(50, 50);

    expect(get).toHaveBeenCalledWith('/mozos?limit=50&offset=50');
    expect(resultado).toBe(respuesta);
  });
});

describe('listarMozosDisponibles', () => {
  it('pide solo los mozos habilitados (CA 4 de #46)', async () => {
    const respuesta = {
      datos: { items: [MOZO], total: 1, limit: 100, offset: 0 },
      exito: true,
    };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);

    const resultado = await listarMozosDisponibles();

    expect(get).toHaveBeenCalledWith('/mozos?estado=HABILITADO&limit=100&offset=0');
    expect(resultado).toBe(respuesta);
  });
});

describe('eliminarMozo', () => {
  it('da de baja el mozo con POST a /mozos/{id}/baja (CA 1 de #45)', async () => {
    const respuesta = { datos: { ...MOZO, estado: 'DESHABILITADO' as const }, exito: true };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

    const resultado = await eliminarMozo(1);

    expect(post).toHaveBeenCalledWith('/mozos/1/baja', {});
    expect(resultado).toBe(respuesta);
  });
});
