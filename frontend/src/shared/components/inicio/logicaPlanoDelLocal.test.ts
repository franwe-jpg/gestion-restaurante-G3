import { describe, expect, it } from 'vitest';

import { clasificarMesas, agruparPorSector } from './logicaMapaDelLocal';
import {
  ANCHO_POR_DEFECTO,
  asignarTipos,
  dibujarPuerta,
  distribuirEnArea,
  escalaDelPlano,
  generarPlano,
  partirPared,
} from './logicaPlanoDelLocal';
import type { Ambiente, MesaApi, Rect, SectorDelMapa } from './types';

function sector(id: number, nombre: string, cantidad: number, capacidad = 4): SectorDelMapa {
  const mesas: MesaApi[] = Array.from({ length: cantidad }, (_, i) => ({
    id: id * 100 + i,
    numero: i + 1,
    capacidad,
    sector: { id, nombre },
    estado: 'LIBRE',
  }));
  return { id, nombre, mesas: clasificarMesas(mesas, []) };
}

function seSuperponen(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.alto && b.y < a.y + a.alto;
}

/** Caja que ocupa una mesa de 4 (56 px + sillas de 20 px) con la escala dada. */
function cajaDeMesa(x: number, y: number, escala: number): Rect {
  const medio = 48 * escala;
  return { x: x - medio, y: y - medio, ancho: medio * 2, alto: medio * 2 };
}

describe('escalaDelPlano', () => {
  it('es compacta con todos los sectores y más chica en pantallas angostas', () => {
    expect(escalaDelPlano(640, true)).toBe(0.78);
    expect(escalaDelPlano(300, true)).toBe(0.6);
    expect(escalaDelPlano(640, false)).toBe(1);
    expect(escalaDelPlano(300, false)).toBe(0.75);
  });
});

describe('asignarTipos', () => {
  it('el sector con más mesas es el salón y el de nombre exterior es la terraza, al final', () => {
    const tipos = asignarTipos([sector(1, 'Salón principal', 12), sector(2, 'Terraza', 6)]);

    expect(tipos.map((s) => [s.nombre, s.tipo])).toEqual([
      ['Salón principal', 'salon'],
      ['Terraza', 'terraza'],
    ]);
  });

  it('una terraza con más mesas no desplaza al salón; los demás son salas por nombre', () => {
    const tipos = asignarTipos([
      sector(1, 'Barra', 2),
      sector(2, 'Patio', 9),
      sector(3, 'Salón', 5),
      sector(4, 'Privado', 2),
    ]);

    expect(tipos.map((s) => [s.nombre, s.tipo])).toEqual([
      ['Salón', 'salon'],
      ['Barra', 'sala'],
      ['Privado', 'sala'],
      ['Patio', 'terraza'],
    ]);
  });

  it('sin nombres de exterior, el primer sector restante es la terraza', () => {
    const tipos = asignarTipos([sector(1, 'A', 5), sector(2, 'B', 2), sector(3, 'C', 1)]);

    expect(tipos.map((s) => [s.nombre, s.tipo])).toEqual([
      ['A', 'salon'],
      ['C', 'sala'],
      ['B', 'terraza'],
    ]);
  });

  it('un solo sector es el salón', () => {
    expect(asignarTipos([sector(1, 'Terraza', 3)])[0]?.tipo).toBe('salon');
  });
});

describe('distribuirEnArea', () => {
  it('ubica las mesas por número en 2 columnas, centradas en su celda', () => {
    const { mesas } = sector(1, 'Salón', 3);

    const grilla = distribuirEnArea([...mesas].reverse(), 600, 1);

    expect(grilla).toMatchObject({ columnas: 2, filas: 2, alto: 260 });
    expect(grilla.posiciones.map((p) => [p.mesa.numero, p.x, p.y])).toEqual([
      [1, 150, 65],
      [2, 450, 65],
      [3, 150, 195],
    ]);
  });

  it('con más de 6 mesas usa 3 columnas', () => {
    expect(distribuirEnArea(sector(1, 'Salón', 7).mesas, 600, 1)).toMatchObject({
      columnas: 3,
      filas: 3,
    });
  });

  it('baja las columnas si las mesas no entran en el ancho', () => {
    expect(distribuirEnArea(sector(1, 'Salón', 7, 8).mesas, 250, 0.6).columnas).toBe(2);
  });

  it('sin mesas no ocupa alto', () => {
    expect(distribuirEnArea([], 600, 1)).toMatchObject({ filas: 0, alto: 0, posiciones: [] });
  });
});

describe('dibujarPuerta', () => {
  it('dibuja la hoja perpendicular hacia adentro y el arco de giro hasta el otro lado del vano', () => {
    const puerta = dibujarPuerta(
      { desde: { x: 40, y: 0 }, hasta: { x: 60, y: 0 } },
      { x: 0, y: 1 },
    );

    expect(puerta.hoja).toEqual({ desde: { x: 40, y: 0 }, hasta: { x: 40, y: 20 } });
    expect(puerta.arco).toBe('M 40 20 A 20 20 0 0 0 60 0');
  });

  it('elige el sentido del arco según la pared', () => {
    const puerta = dibujarPuerta(
      { desde: { x: 10, y: 60 }, hasta: { x: 10, y: 40 } },
      { x: -1, y: 0 },
    );

    expect(puerta.arco).toBe('M -10 60 A 20 20 0 0 1 10 40');
  });
});

describe('partirPared', () => {
  it('deja huecos para ventanas y puertas y devuelve los tramos de pared', () => {
    const tramos = partirPared(
      { desde: { x: 0, y: 0 }, hasta: { x: 100, y: 0 } },
      [
        { centro: 70, ancho: 20, tipo: 'puerta' },
        { centro: 30, ancho: 20, tipo: 'ventana' },
      ],
      { x: 0, y: 1 },
    );

    expect(tramos.paredes).toEqual([
      { desde: { x: 0, y: 0 }, hasta: { x: 20, y: 0 } },
      { desde: { x: 40, y: 0 }, hasta: { x: 60, y: 0 } },
      { desde: { x: 80, y: 0 }, hasta: { x: 100, y: 0 } },
    ]);
    expect(tramos.ventanas).toEqual([{ desde: { x: 20, y: 0 }, hasta: { x: 40, y: 0 } }]);
    expect(tramos.puertas).toHaveLength(1);
  });

  it('un paso es un hueco sin hoja', () => {
    const tramos = partirPared(
      { desde: { x: 0, y: 0 }, hasta: { x: 0, y: 100 } },
      [{ centro: 50, ancho: 40, tipo: 'paso' }],
      { x: 1, y: 0 },
    );

    expect(tramos.paredes).toHaveLength(2);
    expect(tramos.puertas).toEqual([]);
    expect(tramos.ventanas).toEqual([]);
  });
});

function bloque(ambiente: Ambiente, tipo: 'cocina' | 'barra'): Rect {
  const encontrado = ambiente.bloques.find((b) => b.tipo === tipo);
  if (encontrado === undefined) throw new Error(`sin ${tipo}`);
  return encontrado;
}

function planoDeEjemplo() {
  const sectores = asignarTipos([sector(1, 'Salón principal', 12), sector(2, 'Terraza', 6)]);
  return generarPlano(sectores, ANCHO_POR_DEFECTO, 0.78);
}

describe('generarPlano', () => {
  it('el salón tiene cocina, barra, entrada con puerta y ventanas', () => {
    const [salon] = planoDeEjemplo().ambientes;

    expect(salon?.tipo).toBe('salon');
    expect(salon?.bloques.map((b) => b.nombre)).toEqual(['Cocina', 'Barra']);
    expect(salon?.entrada).not.toBeNull();
    expect(salon?.puertas.length).toBeGreaterThanOrEqual(1);
    expect(salon?.ventanas.length).toBeGreaterThanOrEqual(2);
  });

  it('ninguna mesa pisa la cocina ni la barra, y todas quedan dentro de su área', () => {
    for (const ambiente of planoDeEjemplo().ambientes) {
      for (const { x, y } of ambiente.mesas) {
        const caja = cajaDeMesa(x, y, 0.78);
        expect(caja.x).toBeGreaterThanOrEqual(ambiente.area.x);
        expect(caja.x + caja.ancho).toBeLessThanOrEqual(ambiente.area.x + ambiente.area.ancho);
        for (const otro of ambiente.bloques) expect(seSuperponen(caja, otro)).toBe(false);
      }
    }
    const [salon] = planoDeEjemplo().ambientes;
    expect(seSuperponen(bloque(salon as Ambiente, 'cocina'), salon?.area as Rect)).toBe(false);
  });

  it('la terraza va debajo del salón, con baranda curva y un paso en la pared que comparten', () => {
    const plano = planoDeEjemplo();
    const [salon, terraza] = plano.ambientes;

    expect(terraza?.tipo).toBe('terraza');
    expect(terraza?.area.y).toBeGreaterThan((salon?.area.y ?? 0) + (salon?.area.alto ?? 0));
    expect(terraza?.baranda).toMatch(/ A /);
    expect(terraza?.paredesInteriores.length).toBe(2);
    expect(plano.alto).toBeGreaterThan((terraza?.area.y ?? 0) + (terraza?.area.alto ?? 0));
  });

  it('las salas extra son más angostas, alternan de lado y tienen puerta', () => {
    const sectores = asignarTipos([
      sector(1, 'Salón', 8),
      sector(2, 'Privado A', 2),
      sector(3, 'Privado B', 2),
      sector(4, 'Terraza', 3),
    ]);

    const [salon, privadoA, privadoB] = generarPlano(sectores, 640, 0.78).ambientes;

    expect(privadoA?.tipo).toBe('sala');
    expect(privadoA?.area.ancho).toBeLessThan(salon?.area.ancho ?? 0);
    expect(privadoA?.area.x).toBeLessThan(privadoB?.area.x ?? 0);
    expect(privadoA?.puertas).toHaveLength(1);
    expect(privadoB?.puertas).toHaveLength(1);
  });

  it('un sector solo cierra su contorno con paredes exteriores', () => {
    const [terraza] = asignarTipos([sector(1, 'Salón', 4), sector(2, 'Terraza', 3)]).slice(1);

    const [solo] = generarPlano(
      [terraza as ReturnType<typeof asignarTipos>[number]],
      640,
      1,
    ).ambientes;

    expect(solo?.paredesInteriores).toEqual([]);
    expect(solo?.paredes.length).toBeGreaterThanOrEqual(2);
    expect(solo?.baranda).toMatch(/ A /);
  });

  it('agruparPorSector + generarPlano dibuja todas las mesas', () => {
    const mesas = [...sector(1, 'Salón', 5).mesas, ...sector(2, 'Terraza', 2).mesas];

    const plano = generarPlano(asignarTipos(agruparPorSector(mesas)), 375, 0.6);

    expect(plano.ambientes.flatMap((a) => a.mesas)).toHaveLength(7);
  });
});
