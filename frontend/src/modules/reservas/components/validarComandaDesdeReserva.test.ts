import { describe, expect, it } from 'vitest';

import { validarComandaDesdeReserva } from './validarComandaDesdeReserva';
import type { LineaEscrita } from './validarComandaDesdeReserva';

const ERROR_PRODUCTO = 'El producto debe ser un número entero mayor que cero';
const ERROR_CANTIDAD = 'La cantidad debe ser un número entero mayor que cero';

function linea(producto: string, cantidad: string, clave = 1): LineaEscrita {
  return { clave, producto, cantidad };
}

describe('validarComandaDesdeReserva: cantidad', () => {
  it.each(['0', '-2', '1.5', '', '   ', 'dos'])('rechaza la cantidad «%s»', (cantidad) => {
    expect(validarComandaDesdeReserva([linea('12', cantidad)])).toEqual({
      1: { cantidad: ERROR_CANTIDAD },
    });
  });

  it.each(['1', '2', '10', ' 3 '])('acepta la cantidad «%s»', (cantidad) => {
    expect(validarComandaDesdeReserva([linea('12', cantidad)])).toEqual({});
  });
});

describe('validarComandaDesdeReserva: producto', () => {
  it.each(['', '   ', '0', '-1', '2.5', 'abc'])('rechaza el producto «%s»', (producto) => {
    expect(validarComandaDesdeReserva([linea(producto, '1')])).toEqual({
      1: { producto: ERROR_PRODUCTO },
    });
  });

  it.each(['1', '12', '1000', ' 7 '])('acepta el producto «%s»', (producto) => {
    expect(validarComandaDesdeReserva([linea(producto, '1')])).toEqual({});
  });
});

describe('validarComandaDesdeReserva: varias líneas', () => {
  it('con la línea 1 válida y la 2 con cantidad 0, el error es solo de la línea 2', () => {
    const errores = validarComandaDesdeReserva([linea('12', '2', 1), linea('13', '0', 2)]);

    expect(errores).toEqual({ 2: { cantidad: ERROR_CANTIDAD } });
    expect(errores[1]).toBeUndefined();
  });

  it('informa producto y cantidad de una misma línea y de otras líneas a la vez', () => {
    const errores = validarComandaDesdeReserva([
      linea('', '0', 1),
      linea('13', '1', 2),
      linea('x', '1', 3),
    ]);

    expect(errores).toEqual({
      1: { producto: ERROR_PRODUCTO, cantidad: ERROR_CANTIDAD },
      3: { producto: ERROR_PRODUCTO },
    });
  });

  it('identifica cada línea por su clave y no por su posición', () => {
    expect(validarComandaDesdeReserva([linea('12', '2', 4), linea('13', '0', 9)])).toEqual({
      9: { cantidad: ERROR_CANTIDAD },
    });
  });
});
