import { describe, expect, it } from 'vitest';

import { armarComanda, horaDelDia } from './detalleDeMesa';
import type { ComandaApi } from './types';

const COMANDA: ComandaApi = {
  id: 128,
  mesa_id: 2,
  estado: 'ABIERTA',
  fecha_hora: '2026-11-09T23:15:00Z',
  detalles: [
    {
      producto_id: 10,
      menu_ejecutivo_id: null,
      cantidad: 2,
      precio_unitario: '12500.00',
      descuento: '1000.00',
      estado_entrega: 'ENTREGADO',
    },
    {
      producto_id: null,
      menu_ejecutivo_id: 3,
      cantidad: 1,
      precio_unitario: '14900.00',
      descuento: '0.00',
      estado_entrega: 'PENDIENTE',
    },
    {
      producto_id: 99,
      menu_ejecutivo_id: null,
      cantidad: 3,
      precio_unitario: '1800.00',
      descuento: '0.00',
      estado_entrega: 'PENDIENTE',
    },
  ],
};

describe('armarComanda', () => {
  it('nombra cada línea con su producto o menú y calcula importe y total con descuento', () => {
    const comanda = armarComanda(
      COMANDA,
      [{ id: 10, nombre: 'Milanesa napolitana' }],
      [{ id: 3, nombre: 'Ejecutivo del mediodía' }],
    );

    expect(comanda.id).toBe(128);
    expect(comanda.fechaHora).toBe('2026-11-09T23:15:00Z');
    expect(comanda.lineas).toEqual([
      { cantidad: 2, nombre: 'Milanesa napolitana', importe: 24000, entregado: true },
      { cantidad: 1, nombre: 'Ejecutivo del mediodía', importe: 14900, entregado: false },
      { cantidad: 3, nombre: 'Producto n.º 99', importe: 5400, entregado: false },
    ]);
    expect(comanda.total).toBe(44300);
  });

  it('cuenta las unidades entregadas sobre el total', () => {
    const comanda = armarComanda(COMANDA, [], []);

    expect(comanda.unidadesEntregadas).toBe(2);
    expect(comanda.unidades).toBe(6);
    expect(comanda.lineas[1]?.nombre).toBe('Menú n.º 3');
  });
});

describe('horaDelDia', () => {
  it('muestra la hora local en formato de 24 horas', () => {
    expect(horaDelDia(new Date(2026, 10, 9, 20, 5).toISOString())).toBe('20:05');
    expect(horaDelDia(new Date(2026, 10, 9, 9, 30).toISOString())).toBe('09:30');
  });

  it('con una fecha inválida devuelve un guion', () => {
    expect(horaDelDia('no es fecha')).toBe('-');
  });
});
