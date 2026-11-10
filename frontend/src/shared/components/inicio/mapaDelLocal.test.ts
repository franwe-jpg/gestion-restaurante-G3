import { describe, expect, it } from 'vitest';

import {
  agruparPorSector,
  clasificarMesas,
  contarPorEstado,
  cumpleEstado,
  describirMesa,
  filtrarMesas,
  formaDeMesa,
} from './mapaDelLocal';
import type { MesaApi, ReservaActiva } from './types';

function reserva(mesa_id: number, hora: string): ReservaActiva {
  return { id: mesa_id * 10, mesa_id, cliente_id: 7, hora, cantidad_personas: 3 };
}

function mesa(id: number, numero: number, sectorId: number, estado: MesaApi['estado']): MesaApi {
  return {
    id,
    numero,
    capacidad: 4,
    sector: { id: sectorId, nombre: sectorId === 1 ? 'Salón' : 'Terraza' },
    estado,
  };
}

describe('clasificarMesas', () => {
  it('marca RESERVADA una mesa LIBRE con reserva activa y toma la hora más temprana', () => {
    const resultado = clasificarMesas(
      [mesa(1, 1, 1, 'LIBRE')],
      [reserva(1, '21:00'), reserva(1, '20:30')],
    );

    expect(resultado[0]).toMatchObject({ estadoVisible: 'RESERVADA', horaReserva: '20:30' });
    expect(resultado[0]?.reserva).toEqual(reserva(1, '20:30'));
  });

  it('deja LIBRE una mesa sin reservas y sin hora', () => {
    const resultado = clasificarMesas([mesa(1, 1, 1, 'LIBRE')], [reserva(2, '20:00')]);

    expect(resultado[0]?.estadoVisible).toBe('LIBRE');
    expect(resultado[0]?.horaReserva).toBeUndefined();
  });

  it('conserva el estado propio de una mesa OCUPADA o FUERA_DE_SERVICIO con reserva', () => {
    const reservas = [reserva(1, '20:00'), reserva(2, '21:00')];

    const resultado = clasificarMesas(
      [mesa(1, 1, 1, 'OCUPADA'), mesa(2, 2, 1, 'FUERA_DE_SERVICIO')],
      reservas,
    );

    expect(resultado.map((m) => m.estadoVisible)).toEqual(['OCUPADA', 'FUERA_DE_SERVICIO']);
    expect(resultado.every((m) => m.horaReserva === undefined)).toBe(true);
  });
});

describe('agruparPorSector', () => {
  it('arma una sección por sector con las mesas ordenadas por número', () => {
    const mesas = clasificarMesas(
      [mesa(1, 5, 1, 'LIBRE'), mesa(2, 2, 2, 'LIBRE'), mesa(3, 3, 1, 'OCUPADA')],
      [],
    );

    const sectores = agruparPorSector(mesas);

    expect(sectores.map((s) => s.nombre)).toEqual(['Salón', 'Terraza']);
    expect(sectores[0]?.mesas.map((m) => m.numero)).toEqual([3, 5]);
  });

  it('devuelve una lista vacía sin mesas', () => {
    expect(agruparPorSector([])).toEqual([]);
  });
});

function mapaDeEjemplo() {
  const mesas: MesaApi[] = [];
  let id = 0;
  const agregar = (cantidad: number, estado: MesaApi['estado'], sector = 1) => {
    for (let i = 0; i < cantidad; i += 1) {
      id += 1;
      mesas.push(mesa(id, id, sector, estado));
    }
  };
  agregar(8, 'LIBRE');
  agregar(3, 'LIBRE', 2);
  agregar(4, 'OCUPADA');
  agregar(1, 'FUERA_DE_SERVICIO');
  const reservas = [9, 10, 11].map((mesa_id) => reserva(mesa_id, '20:00'));
  return clasificarMesas(mesas, reservas);
}

describe('contarPorEstado', () => {
  it('cuenta Libres incluyendo las reservadas', () => {
    expect(contarPorEstado(mapaDeEjemplo())).toEqual({
      libres: 11,
      conReserva: 3,
      ocupadas: 4,
      fueraDeServicio: 1,
    });
  });

  it('devuelve todo en cero sin mesas', () => {
    expect(contarPorEstado([])).toEqual({
      libres: 0,
      conReserva: 0,
      ocupadas: 0,
      fueraDeServicio: 0,
    });
  });
});

describe('filtrarMesas', () => {
  it('sin filtros devuelve todas', () => {
    expect(filtrarMesas(mapaDeEjemplo(), { estado: 'TODAS', sectorId: null })).toHaveLength(16);
  });

  it('filtra por estado: Libres incluye las reservadas y Con reserva solo ellas', () => {
    const mapa = mapaDeEjemplo();

    expect(filtrarMesas(mapa, { estado: 'LIBRES', sectorId: null })).toHaveLength(11);
    expect(filtrarMesas(mapa, { estado: 'CON_RESERVA', sectorId: null })).toHaveLength(3);
    expect(filtrarMesas(mapa, { estado: 'OCUPADAS', sectorId: null })).toHaveLength(4);
    expect(filtrarMesas(mapa, { estado: 'FUERA_DE_SERVICIO', sectorId: null })).toHaveLength(1);
  });

  it('combina sector y estado; un sector sin ocupadas da lista vacía', () => {
    const mapa = mapaDeEjemplo();

    expect(filtrarMesas(mapa, { estado: 'LIBRES', sectorId: 2 })).toHaveLength(3);
    expect(filtrarMesas(mapa, { estado: 'OCUPADAS', sectorId: 2 })).toEqual([]);
  });

  it('las cantidades se recalculan al filtrar por sector', () => {
    const delSector = filtrarMesas(mapaDeEjemplo(), { estado: 'TODAS', sectorId: 2 });

    expect(contarPorEstado(delSector)).toEqual({
      libres: 3,
      conReserva: 3,
      ocupadas: 0,
      fueraDeServicio: 0,
    });
  });
});

describe('formaDeMesa', () => {
  it('elige la forma y las sillas por capacidad', () => {
    expect(formaDeMesa(1)).toEqual({ forma: 'redonda', sillas: 2 });
    expect(formaDeMesa(2)).toEqual({ forma: 'redonda', sillas: 2 });
    expect(formaDeMesa(3)).toEqual({ forma: 'cuadrada', sillas: 4 });
    expect(formaDeMesa(4)).toEqual({ forma: 'cuadrada', sillas: 4 });
    expect(formaDeMesa(6)).toEqual({ forma: 'rectangular', sillas: 6 });
    expect(formaDeMesa(7)).toEqual({ forma: 'larga', sillas: 8 });
    expect(formaDeMesa(12)).toEqual({ forma: 'larga', sillas: 8 });
  });
});

describe('cumpleEstado', () => {
  it('Libres incluye las reservadas; Todas incluye todo', () => {
    const [libre, reservada] = clasificarMesas(
      [mesa(1, 1, 1, 'LIBRE'), mesa(2, 2, 1, 'LIBRE')],
      [reserva(2, '20:00')],
    );

    expect(cumpleEstado(reservada!, 'LIBRES')).toBe(true);
    expect(cumpleEstado(libre!, 'CON_RESERVA')).toBe(false);
    expect(cumpleEstado(libre!, 'TODAS')).toBe(true);
  });
});

describe('describirMesa', () => {
  it('arma el texto accesible con número, sector y estado', () => {
    const [libre, ocupada, fuera, reservada] = clasificarMesas(
      [
        mesa(1, 1, 1, 'LIBRE'),
        mesa(2, 2, 1, 'OCUPADA'),
        mesa(3, 3, 2, 'FUERA_DE_SERVICIO'),
        mesa(5, 5, 2, 'LIBRE'),
      ],
      [reserva(5, '23:00')],
    );

    expect(describirMesa(libre!)).toBe('Mesa 1, Salón, libre');
    expect(describirMesa(ocupada!)).toBe('Mesa 2, Salón, ocupada');
    expect(describirMesa(fuera!)).toBe('Mesa 3, Terraza, fuera de servicio');
    expect(describirMesa(reservada!)).toBe('Mesa 5, Terraza, libre con reserva a las 23:00');
  });
});
