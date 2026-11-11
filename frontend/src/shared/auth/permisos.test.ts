import { describe, expect, it } from 'vitest';

import { PERMISOS_POR_ROL, permisosDe, type Permiso } from './permisos';

const TODOS: Permiso[] = [
  'CARTA_VER',
  'CARTA_GESTIONAR',
  'MENUS_VER',
  'MENUS_GESTIONAR',
  'SALON_VER',
  'SALON_GESTIONAR',
  'COMANDAS_VER',
  'COMANDAS_OPERAR',
  'CLIENTES_GESTIONAR',
  'RESERVAS_VER',
  'RESERVAS_OPERAR',
  'PAGOS_OPERAR',
  'PAGOS_GESTIONAR',
  'REPORTES_VER',
];

describe('permisosDe', () => {
  it('el encargado tiene todos los permisos', () => {
    expect([...permisosDe(['ENCARGADO'])].sort()).toEqual([...TODOS].sort());
  });

  it('el mozo opera comandas, reservas y pagos pero no gestiona ni ve reportes', () => {
    const permisos = permisosDe(['MOZO']);

    expect(permisos.has('COMANDAS_OPERAR')).toBe(true);
    expect(permisos.has('PAGOS_OPERAR')).toBe(true);
    expect(permisos.has('SALON_VER')).toBe(true);
    expect(permisos.has('CARTA_GESTIONAR')).toBe(false);
    expect(permisos.has('SALON_GESTIONAR')).toBe(false);
    expect(permisos.has('PAGOS_GESTIONAR')).toBe(false);
    expect(permisos.has('REPORTES_VER')).toBe(false);
  });

  it('el chef solo ve carta, menús, comandas y reservas', () => {
    expect([...permisosDe(['CHEF'])].sort()).toEqual(
      ['CARTA_VER', 'COMANDAS_VER', 'MENUS_VER', 'RESERVAS_VER'].sort(),
    );
  });

  it('un usuario con dos roles recibe la unión de sus permisos', () => {
    const permisos = permisosDe(['MOZO', 'CHEF']);

    expect(permisos).toEqual(new Set([...PERMISOS_POR_ROL.MOZO, ...PERMISOS_POR_ROL.CHEF]));
    expect(permisos.has('SALON_VER')).toBe(true);
    expect(permisos.has('CARTA_GESTIONAR')).toBe(false);
  });

  it('sin roles no hay permisos', () => {
    expect(permisosDe([]).size).toBe(0);
  });
});
