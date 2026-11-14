import { describe, expect, it } from 'vitest';

import {
  NOMBRE_LARGO_MAXIMO,
  errorDelServidor,
  filtrarNombre,
  filtrarTelefono,
  turnoValido,
  validarClienteNuevo,
  validarReserva,
} from './validarReserva';
import type { DatosFormularioReserva, SeleccionCliente } from './validarReserva';

const HOY = '2026-11-02';
const AHORA = '12:00';

const EXISTENTE: SeleccionCliente = {
  tipo: 'existente',
  cliente: { id: 7, nombre: 'Ana Pérez', telefono: '+54 280 1234567' },
};

function nuevo(nombre: string, telefono: string): SeleccionCliente {
  return { tipo: 'nuevo', nombre, telefono };
}

const VALIDOS: DatosFormularioReserva = {
  cliente: EXISTENTE,
  fecha: '2026-11-03',
  hora: '21:30',
  cantidad: '4',
  mesa: '5',
};

function validar(cambios: Partial<DatosFormularioReserva> = {}) {
  return validarReserva({ ...VALIDOS, ...cambios }, 'alta', HOY, AHORA);
}

describe('validarReserva: datos obligatorios', () => {
  it('acepta datos válidos', () => {
    expect(validar()).toEqual({});
  });

  it('pide cada campo vacío (formulario de alta)', () => {
    const vacios = {
      cliente: { tipo: 'ninguno' } as const,
      fecha: '',
      hora: '',
      cantidad: '',
      mesa: '',
    };

    expect(validar(vacios)).toEqual({
      cliente: 'El cliente es obligatorio.',
      fecha: 'La fecha es obligatoria.',
      hora: 'La hora es obligatoria.',
      cantidad: 'La cantidad de personas es obligatoria.',
      mesa: 'La mesa es obligatoria.',
    });
  });

  it('trata un texto con solo espacios como vacío', () => {
    expect(validar({ cantidad: '   ' }).cantidad).toBe('La cantidad de personas es obligatoria.');
  });
});

describe('validarReserva: enteros positivos', () => {
  it.each(['0', '-2', 'abc', '2.5'])('rechaza la cantidad de personas %s', (cantidad) => {
    expect(validar({ cantidad }).cantidad).toBe(
      'La cantidad de personas debe ser un entero positivo.',
    );
  });

  it('acepta una persona (límite inferior)', () => {
    expect(validar({ cantidad: '1' })).toEqual({});
  });
});

describe('validarReserva: Mesa del alta', () => {
  it('pide la mesa cuando está vacía', () => {
    expect(validar({ mesa: '' })).toEqual({ mesa: 'La mesa es obligatoria.' });
  });

  it.each(['abc', '-1', '0', '5'])(
    'solo exige que no esté vacía: «%s» no produce error de Mesa (sale de una opción del selector)',
    (mesa) => {
      expect(validar({ mesa })).toEqual({});
    },
  );
});

function validarConCapacidad(
  cantidad: string,
  capacidad?: number,
  modo: 'alta' | 'edicion' = 'alta',
) {
  return validarReserva({ ...VALIDOS, cantidad }, modo, HOY, AHORA, capacidad);
}

/**
 * Supuesto S67 (corrección 2026-11-11, pendiente de validación del equipo): la cantidad de
 * personas no puede superar la capacidad de la mesa. Con la mesa elegida en el alta, el formulario
 * avisa antes de enviar; sin capacidad conocida (sin mesa elegida o en la edición) no valida nada.
 */
describe('validarReserva: capacidad de la mesa elegida', () => {
  it.each([
    ['la capacidad exacta (límite)', '4', 4],
    ['menos que la capacidad', '1', 4],
    ['la capacidad exacta de una mesa de dos', '2', 2],
  ])('acepta %s', (_caso, cantidad, capacidad) => {
    expect(validarConCapacidad(cantidad, capacidad)).toEqual({});
  });

  it('compara la cantidad ya recortada', () => {
    expect(validarConCapacidad(' 4 ', 4)).toEqual({});
    expect(validarConCapacidad(' 5 ', 4)).toHaveProperty('mesa');
  });

  it('sin capacidad conocida no compara la cantidad', () => {
    expect(validarConCapacidad('500')).toEqual({});
  });

  it('una cantidad inválida conserva su propio mensaje, no el de la capacidad', () => {
    expect(validarConCapacidad('0', 4)).toEqual({
      cantidad: 'La cantidad de personas debe ser un entero positivo.',
    });
    expect(validarConCapacidad('', 4)).toEqual({
      cantidad: 'La cantidad de personas es obligatoria.',
    });
  });

  it('en la edición con capacidad desconocida deja pasar cualquier cantidad: lo decide la API', () => {
    expect(validarConCapacidad('9', undefined, 'edicion')).toEqual({});
  });
});

/**
 * Supuesto S72 (corrección 2026-11-13, pendiente de validación del equipo): el aviso de capacidad
 * va en el campo Mesa y no en Cantidad de personas; el texto no cambia.
 */
describe('validarReserva: el aviso de capacidad es del campo Mesa (S72)', () => {
  it.each([
    ['una persona más que la capacidad', '5', 4, 'La mesa elegida admite hasta 4 personas.'],
    ['nueve personas en una mesa de dos', '9', 2, 'La mesa elegida admite hasta 2 personas.'],
    ['500 personas', '500', 4, 'La mesa elegida admite hasta 4 personas.'],
    ['dos personas en una mesa de una', '2', 1, 'La mesa elegida admite hasta 1 persona.'],
    ['una cantidad con espacios', ' 5 ', 4, 'La mesa elegida admite hasta 4 personas.'],
  ])('rechaza %s en el campo Mesa y no en Cantidad', (_caso, cantidad, capacidad, mensaje) => {
    const errores = validarConCapacidad(cantidad, capacidad);

    expect(errores).toEqual({ mesa: mensaje });
    expect(errores).not.toHaveProperty('cantidad');
  });

  it('en la edición con la capacidad conocida el aviso también va en el campo Mesa', () => {
    expect(validarConCapacidad('9', 4, 'edicion')).toEqual({
      mesa: 'La mesa elegida admite hasta 4 personas.',
    });
  });

  it('el error de capacidad convive con los de los demás campos', () => {
    const errores = validarReserva(
      { ...VALIDOS, fecha: '2026-11-01', cantidad: '5' },
      'alta',
      HOY,
      AHORA,
      4,
    );

    expect(errores).toEqual({
      fecha: 'La fecha no puede ser anterior a hoy.',
      mesa: 'La mesa elegida admite hasta 4 personas.',
    });
  });
});

describe('turnoValido', () => {
  it.each([
    ['la fecha está vacía', '', '21:30'],
    ['la hora está vacía', '2026-11-03', ''],
    ['la fecha es anterior a hoy', '2026-11-01', '21:30'],
    ['hoy y la hora ya pasó', HOY, '11:30'],
    ['hoy y la hora es igual a la actual (límite)', HOY, AHORA],
  ])('es false si %s', (_caso, fecha, hora) => {
    expect(turnoValido(fecha, hora, HOY, AHORA)).toBe(false);
  });

  it.each([
    ['hoy y la hora es posterior a la actual (límite)', HOY, '12:01'],
    ['otro día con una hora anterior a la actual', '2026-11-03', '08:00'],
    ['otro día con una hora posterior', '2026-11-03', '21:30'],
  ])('es true si %s', (_caso, fecha, hora) => {
    expect(turnoValido(fecha, hora, HOY, AHORA)).toBe(true);
  });
});

describe('validarReserva: fecha y hora', () => {
  it('rechaza una fecha anterior a hoy', () => {
    expect(validar({ fecha: '2026-11-01' }).fecha).toBe('La fecha no puede ser anterior a hoy.');
  });

  it('acepta hoy con la fecha igual (límite) si la hora es posterior', () => {
    expect(validar({ fecha: HOY, hora: '12:01' })).toEqual({});
  });

  it.each(['11:30', '12:00'])('rechaza hoy con la hora %s (pasada o igual)', (hora) => {
    expect(validar({ fecha: HOY, hora }).hora).toBe('La hora debe ser posterior a la hora actual.');
  });

  it('acepta otro día con una hora anterior a la actual', () => {
    expect(validar({ fecha: '2026-11-03', hora: '08:00' })).toEqual({});
  });
});

describe('validarReserva: modo edición', () => {
  function validarEdicion(cambios: Partial<DatosFormularioReserva> = {}) {
    return validarReserva({ ...VALIDOS, ...cambios }, 'edicion', HOY, AHORA);
  }

  it('acepta datos válidos', () => {
    expect(validarEdicion()).toEqual({});
  });

  it('no valida Cliente ni Mesa, aunque estén vacíos o mal escritos', () => {
    expect(validarEdicion({ cliente: { tipo: 'ninguno' }, mesa: 'abc' })).toEqual({});
  });

  it('valida fecha, hora y cantidad de personas igual que el alta', () => {
    const invalidos = { fecha: '2026-11-01', hora: '', cantidad: '0' };

    expect(validarEdicion(invalidos)).toEqual({
      fecha: 'La fecha no puede ser anterior a hoy.',
      hora: 'La hora es obligatoria.',
      cantidad: 'La cantidad de personas debe ser un entero positivo.',
    });
    expect(validarEdicion({ fecha: HOY, hora: AHORA }).hora).toBe(
      'La hora debe ser posterior a la hora actual.',
    );
  });
});

describe('validarReserva: Cliente del alta', () => {
  it('un cliente existente no produce error', () => {
    expect(validar({ cliente: EXISTENTE })).toEqual({});
  });

  it('sin cliente elegido pide el cliente', () => {
    expect(validar({ cliente: { tipo: 'ninguno' } })).toEqual({
      cliente: 'El cliente es obligatorio.',
    });
  });

  it('con cliente nuevo vacío pide Nombre y Teléfono', () => {
    expect(validar({ cliente: nuevo('', '') })).toEqual({
      nombre: 'El nombre es obligatorio',
      telefono: 'El teléfono es obligatorio',
    });
  });

  it('con cliente nuevo válido no produce error', () => {
    expect(validar({ cliente: nuevo('Luis Gómez', '280-4556677') })).toEqual({});
  });
});

/**
 * Paridad del nombre con `ClienteNuevo` de M4 (`atencion/schemas.py`, S42): no puede ser más
 * estricto. El teléfono ya no es paridad con M4: tiene reglas propias de largo (S66, más abajo).
 */
describe('validarClienteNuevo: paridad con M4', () => {
  it.each([
    ['Ana', '123456'],
    ['María José', '+54123-456'],
    ['Zoë', '------123456'],
    ['Ana  Luis', '123456'],
    ['  Ana  ', '  123456  '],
  ])('acepta nombre «%s» y teléfono «%s»', (nombre, telefono) => {
    expect(validarClienteNuevo(nombre, telefono)).toEqual({});
  });

  it.each(['Ana2', 'Ana!', 'Ana@Luis'])('rechaza el nombre «%s»', (nombre) => {
    expect(validarClienteNuevo(nombre, '123456').nombre).toBe(
      'El nombre debe contener solo letras',
    );
  });

  it.each(['12a3', '12+34', '(123)'])('rechaza el teléfono «%s»', (telefono) => {
    expect(validarClienteNuevo('Ana', telefono).telefono).toBe(
      'El teléfono solo admite dígitos, guiones y + al inicio',
    );
  });

  it('un texto con solo espacios cuenta como vacío', () => {
    expect(validarClienteNuevo('   ', '   ')).toEqual({
      nombre: 'El nombre es obligatorio',
      telefono: 'El teléfono es obligatorio',
    });
  });
});

/**
 * Supuesto S66 (corrección 2026-11-11, revisada el 2026-11-13, pendiente de validación del equipo):
 * `+` opcional solo al inicio, dígitos y guiones, sin espacios en el interior; entre 6 y 15 dígitos
 * y hasta 20 caracteres en total; los espacios de los extremos se recortan. Es la misma regla que
 * `ClienteNuevo` del backend de M5.
 */
describe('validarClienteNuevo: teléfono (S66)', () => {
  const MENSAJE_DIGITOS = 'El teléfono debe tener entre 6 y 15 dígitos';
  const MENSAJE_LARGO = 'El teléfono admite hasta 20 caracteres';
  const MENSAJE_CARACTERES = 'El teléfono solo admite dígitos, guiones y + al inicio';

  it.each([
    '123456', // 6 dígitos: límite inferior
    '123456789012345', // 15 dígitos: límite superior
    '+123-456-789-012-345', // 20 caracteres: límite del largo total
    '  +123-456-789-012-345  ', // el largo se mide ya recortado
    '+542801234567',
    '280-4556677',
  ])('acepta «%s»', (telefono) => {
    expect(validarClienteNuevo('Ana', telefono).telefono).toBeUndefined();
  });

  it.each(['+54 280 1234567', '28 04 12 34 56', '280 4123456', '+ 54 280 123456', '123\t456'])(
    'rechaza «%s» por tener un espacio en el interior',
    (telefono) => {
      expect(validarClienteNuevo('Ana', telefono).telefono).toBe(MENSAJE_CARACTERES);
    },
  );

  it.each([
    ['12345', 'cinco dígitos'],
    ['1', 'un dígito'],
    ['---', 'ningún dígito'],
    ['+--', 'ningún dígito con prefijo'],
    ['1234567890123456', 'dieciséis dígitos'],
  ])('rechaza «%s» (%s)', (telefono) => {
    expect(validarClienteNuevo('Ana', telefono).telefono).toBe(MENSAJE_DIGITOS);
  });

  it.each(['+123--456-789-012-345', '1'.repeat(21), '1'.repeat(300)])(
    'rechaza «%s» por tener más de 20 caracteres',
    (telefono) => {
      expect(validarClienteNuevo('Ana', telefono).telefono).toBe(MENSAJE_LARGO);
    },
  );

  it.each(['abc123', '2804abc123', '+', '280+456'])(
    'rechaza «%s» por sus caracteres',
    (telefono) => {
      expect(validarClienteNuevo('Ana', telefono).telefono).toBe(MENSAJE_CARACTERES);
    },
  );
});

describe('filtrarTelefono', () => {
  it.each([
    ['2804abc123', '2804123'],
    ['(280) 123.456', '280123456'],
    ['+54 280-123', '+54280-123'],
    ['+54 280 123-4567', '+54280123-4567'],
    ['54+280', '54280'],
    ['++54', '+54'],
    ['a+54', '+54'],
    [' +54', '+54'],
    ['28 04\t12\u00a034', '28041234'],
    ['   ', ''],
    ['abc', ''],
    ['', ''],
  ])('«%s» queda «%s»', (texto, esperado) => {
    expect(filtrarTelefono(texto)).toBe(esperado);
  });
});

/**
 * Supuesto S70 (corrección 2026-11-13, pendiente de validación del equipo): el campo Nombre solo
 * deja escribir letras (con acentos) y espacios, y admite hasta 60 caracteres.
 */
describe('filtrarNombre', () => {
  it.each([
    ['Ana Pérez', 'Ana Pérez'],
    ['María José', 'María José'],
    ['Zoë Núñez', 'Zoë Núñez'],
    ['Ana2', 'Ana'],
    ['4na', 'na'],
    ['Ana!@#$%', 'Ana'],
    ['O’Brien-Gil', 'OBrienGil'],
    ['Ana\tLuis', 'AnaLuis'],
    ['12345', ''],
    ['', ''],
  ])('«%s» queda «%s»', (texto, esperado) => {
    expect(filtrarNombre(texto)).toBe(esperado);
  });

  it('conserva los espacios, también los de los extremos y los seguidos', () => {
    expect(filtrarNombre('  Ana  Luis ')).toBe('  Ana  Luis ');
  });
});

describe('validarClienteNuevo: largo del nombre (S70)', () => {
  const MENSAJE = 'El nombre admite hasta 60 caracteres';

  it('el máximo es de 60 caracteres', () => {
    expect(NOMBRE_LARGO_MAXIMO).toBe(60);
  });

  it.each([
    ['60 letras (límite)', 'a'.repeat(60)],
    ['60 letras con espacios en los extremos', `  ${'a'.repeat(60)}   `],
    ['una letra', 'a'],
  ])('acepta %s', (_caso, nombre) => {
    expect(validarClienteNuevo(nombre, '123456').nombre).toBeUndefined();
  });

  it.each([
    ['61 letras', 'a'.repeat(61)],
    ['61 letras con espacios en los extremos', `  ${'a'.repeat(61)}   `],
    ['300 letras', 'a'.repeat(300)],
  ])('rechaza %s con «El nombre admite hasta 60 caracteres»', (_caso, nombre) => {
    expect(validarClienteNuevo(nombre, '123456').nombre).toBe(MENSAJE);
  });

  it('un nombre con un dígito y muy largo conserva primero el mensaje de las letras', () => {
    expect(validarClienteNuevo(`${'a'.repeat(61)}1`, '123456').nombre).toBe(
      'El nombre debe contener solo letras',
    );
  });
});

describe('errorDelServidor', () => {
  const MENSAJE_409 =
    'La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas';

  it('deja el texto del 404, 409 o 422 como error general', () => {
    expect(errorDelServidor(MENSAJE_409, nuevo('Luis', '123'))).toEqual({ general: MENSAJE_409 });
  });

  it.each([
    'Datos invalidos. telefono: telefono solo admite dígitos, guiones y + al inicio',
    'Datos invalidos. cliente_nuevo.telefono: telefono solo admite dígitos, guiones y + al inicio',
    'Datos invalidos. cliente_nuevo.telefono: Field required',
    'Datos invalidos. cliente_nuevo.telefono: telefono debe tener entre 6 y 15 dígitos',
    'Datos invalidos. cliente_nuevo.telefono: telefono admite hasta 20 caracteres',
  ])('lleva «%s» al campo Teléfono con un cliente nuevo', (mensaje) => {
    expect(errorDelServidor(mensaje, nuevo('Luis', 'abc'))).toEqual({ telefono: mensaje });
  });

  it.each([
    'Datos invalidos. nombre: nombre solo admite letras y espacios',
    'Datos invalidos. cliente_nuevo.nombre: nombre admite hasta 60 caracteres',
  ])('lleva «%s» al campo Nombre con un cliente nuevo', (mensaje) => {
    expect(errorDelServidor(mensaje, nuevo('Luis3', '123'))).toEqual({ nombre: mensaje });
  });

  it.each([
    ['existente', EXISTENTE],
    ['ninguno', { tipo: 'ninguno' } as SeleccionCliente],
  ])('con cliente %s el 422 de un campo queda como error general', (_caso, seleccion) => {
    const mensaje = 'Datos invalidos. telefono: telefono es obligatorio';

    expect(errorDelServidor(mensaje, seleccion)).toEqual({ general: mensaje });
  });

  it('el 422 de cliente_id/cliente_nuevo queda como error general', () => {
    const mensaje = 'Datos invalidos. cliente_id/cliente_nuevo: indique un cliente registrado';

    expect(errorDelServidor(mensaje, nuevo('Luis', '123'))).toEqual({ general: mensaje });
  });
});

/**
 * Supuesto S72 (corrección 2026-11-13, pendiente de validación del equipo): el 409 de capacidad
 * se muestra bajo el campo Mesa; los demás 404, 409 y 422 siguen como error general.
 */
describe('errorDelServidor: capacidad de la mesa (S72)', () => {
  it.each([
    'La mesa 5 admite hasta 4 personas',
    'La mesa 12 admite hasta 1 persona',
    'La mesa 7 admite hasta 20 personas',
  ])('lleva «%s» al campo Mesa con cualquier cliente', (mensaje) => {
    for (const seleccion of [EXISTENTE, nuevo('Luis', '123456'), { tipo: 'ninguno' } as const]) {
      expect(errorDelServidor(mensaje, seleccion)).toEqual({ mesa: mensaje });
    }
  });

  it.each([
    'La mesa 5 ya tiene una reserva el 2026-11-03 a las 21:30; cada reserva ocupa la mesa 2 horas',
    'La mesa 6 está fuera de servicio',
    'La mesa 99 no existe',
    'La reserva 12 no está activa y no se puede modificar',
    'Datos invalidos. cantidad_personas: Input should be greater than 0',
  ])('deja «%s» como error general', (mensaje) => {
    expect(errorDelServidor(mensaje, EXISTENTE)).toEqual({ general: mensaje });
  });
});
