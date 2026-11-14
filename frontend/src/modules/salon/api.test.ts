import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import {
  crearChef,
  crearMesa,
  crearMozo,
  crearSector,
  eliminarChef,
  eliminarMesa,
  eliminarMozo,
  eliminarSector,
  listarChefs,
  listarMesas,
  listarMozos,
  listarMozosDisponibles,
  listarSectores,
  listarSectoresHabilitados,
  modificarChef,
  modificarMesa,
  modificarMozo,
  modificarSector,
  obtenerReporteMozos,
} from './api';
import type {
  Chef,
  ChefCrear,
  ChefModificar,
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
  correo: 'juan@resto.com',
};

describe('crearMozo', () => {
  it('envía el alta por POST a /mozos y devuelve el mozo creado (CA 1 de #43)', async () => {
    const datos: MozoCrear = {
      dni: '30123456',
      nombre: 'Juan',
      apellido: 'Fernández',
      telefono: '280 412-3456',
      correo: 'juan@resto.com',
      contrasena: 'clave-1234',
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
      correo: 'juan@resto.com',
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

describe('obtenerReporteMozos', () => {
  it('arma la consulta con el período y los dos filtros opcionales (HU-M3-13)', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ datos: null, exito: false });

    await obtenerReporteMozos('2026-11-01', '2026-11-05', 3, 2);

    expect(get).toHaveBeenCalledWith(
      '/reportes/mesas-ventas-por-mozo?fecha_desde=2026-11-01&fecha_hasta=2026-11-05&mozo_id=3&sector_id=2',
    );
  });

  it('omite mozo y sector cuando no se eligen (HU-M3-13)', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ datos: null, exito: false });

    await obtenerReporteMozos('2026-11-01', '2026-11-05');

    expect(get).toHaveBeenCalledWith(
      '/reportes/mesas-ventas-por-mozo?fecha_desde=2026-11-01&fecha_hasta=2026-11-05',
    );
  });
});

const CHEF: Chef = {
  id: 4,
  dni: '28111222',
  nombre: 'Marta',
  apellido: 'Gómez',
  telefono: null,
  estado: 'HABILITADO',
  correo: 'marta@resto.com',
};

describe('crearChef', () => {
  it('envía el alta por POST a /chefs con correo y contraseña', async () => {
    const datos: ChefCrear = {
      dni: '28111222',
      nombre: 'Marta',
      apellido: 'Gómez',
      telefono: null,
      correo: 'marta@resto.com',
      contrasena: 'clave-1234',
    };
    const respuesta = { datos: CHEF, exito: true };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

    const resultado = await crearChef(datos);

    expect(post).toHaveBeenCalledWith('/chefs', datos);
    expect(resultado).toBe(respuesta);
  });
});

describe('modificarChef', () => {
  it('envía la modificación por PUT a /chefs/{id}; la contraseña es opcional', async () => {
    const datos: ChefModificar = {
      dni: '28111222',
      nombre: 'Marta',
      apellido: 'Gómez',
      telefono: '280 1',
      correo: 'marta@resto.com',
    };
    const respuesta = { datos: { ...CHEF, telefono: '280 1' }, exito: true };
    const put = vi.spyOn(clienteHttp, 'put').mockResolvedValue(respuesta);

    const resultado = await modificarChef(4, datos);

    expect(put).toHaveBeenCalledWith('/chefs/4', datos);
    expect(resultado).toBe(respuesta);
  });
});

describe('listarChefs', () => {
  it('pide los chefs paginados', async () => {
    const respuesta = {
      datos: { items: [CHEF], total: 1, limit: 50, offset: 50 },
      exito: true,
    };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);

    const resultado = await listarChefs(50, 50);

    expect(get).toHaveBeenCalledWith('/chefs?limit=50&offset=50');
    expect(resultado).toBe(respuesta);
  });
});

describe('eliminarChef', () => {
  it('da de baja con POST a /chefs/{id}/baja', async () => {
    const respuesta = { datos: { ...CHEF, estado: 'DESHABILITADO' as const }, exito: true };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

    const resultado = await eliminarChef(4);

    expect(post).toHaveBeenCalledWith('/chefs/4/baja', {});
    expect(resultado).toBe(respuesta);
  });
});
