import { describe, expect, it } from 'vitest';

import { errorDelServidor, validarPersona } from './validarPersona';

const VALIDO = {
  dni: '30123456',
  nombre: 'Juan',
  apellido: 'Fernández',
  telefono: '280 412-3456',
  correo: 'juan@resto.com',
  contrasena: 'clave-1234',
};

const AL_CREAR = { contrasenaObligatoria: true };
const AL_EDITAR = { contrasenaObligatoria: false };

describe('validarPersona: datos personales', () => {
  it('acepta los datos válidos (CA 1)', () => {
    expect(validarPersona(VALIDO, AL_CREAR)).toEqual({});
    expect(validarPersona({ ...VALIDO, telefono: '' }, AL_CREAR)).toEqual({});
  });

  it('pide DNI, nombre y apellido cuando están vacíos (CA 2)', () => {
    const errores = validarPersona({ ...VALIDO, dni: '', nombre: '', apellido: '' }, AL_CREAR);

    expect(errores).toEqual({
      dni: 'El DNI es obligatorio.',
      nombre: 'El nombre es obligatorio.',
      apellido: 'El apellido es obligatorio.',
    });
  });

  it.each(['301234', '301234567', '3012345a', '30.123.456', 'abcdefgh'])(
    'rechaza el DNI «%s» por no tener 7 u 8 dígitos (CA 5)',
    (dni) => {
      expect(validarPersona({ ...VALIDO, dni }, AL_CREAR).dni).toBe(
        'El DNI debe tener 7 u 8 dígitos.',
      );
    },
  );

  it('acepta DNI de 7 u 8 dígitos (CA 5)', () => {
    expect(validarPersona({ ...VALIDO, dni: '7123456' }, AL_CREAR)).toEqual({});
    expect(validarPersona({ ...VALIDO, dni: ' 30123456 ' }, AL_CREAR)).toEqual({});
  });

  it.each(['Juan123', 'Juan!', 'Fer$andez'])(
    'rechaza el nombre «%s» por no tener solo letras (CA 6)',
    (nombre) => {
      expect(validarPersona({ ...VALIDO, nombre }, AL_CREAR).nombre).toBe(
        'El nombre solo debe contener letras.',
      );
    },
  );

  it.each(['Fernández2', 'Pérez@'])(
    'rechaza el apellido «%s» por no tener solo letras (CA 6)',
    (apellido) => {
      expect(validarPersona({ ...VALIDO, apellido }, AL_CREAR).apellido).toBe(
        'El apellido solo debe contener letras.',
      );
    },
  );
});

describe('validarPersona: nombres y teléfono', () => {
  it('acepta nombres con acentos y espacios', () => {
    expect(
      validarPersona({ ...VALIDO, nombre: 'María José', apellido: 'Núñez' }, AL_CREAR),
    ).toEqual({});
  });

  it('rechaza un teléfono de más de 30 caracteres', () => {
    expect(validarPersona({ ...VALIDO, telefono: 'a'.repeat(31) }, AL_CREAR).telefono).toBe(
      'El teléfono supera los 30 caracteres permitidos.',
    );
  });
});

describe('validarPersona: correo', () => {
  it('pide el correo cuando está vacío o solo tiene espacios', () => {
    expect(validarPersona({ ...VALIDO, correo: '' }, AL_CREAR).correo).toBe(
      'El correo es obligatorio.',
    );
    expect(validarPersona({ ...VALIDO, correo: '   ' }, AL_EDITAR).correo).toBe(
      'El correo es obligatorio.',
    );
  });

  it.each(['sin-arroba', 'a@b', '@resto.com', 'a b@resto.com', 'a@resto.'])(
    'rechaza el correo «%s» por no tener formato válido',
    (correo) => {
      expect(validarPersona({ ...VALIDO, correo }, AL_CREAR).correo).toBe(
        'El correo no tiene un formato válido.',
      );
    },
  );

  it('acepta un correo con espacios alrededor', () => {
    expect(validarPersona({ ...VALIDO, correo: '  ana@resto.com ' }, AL_CREAR)).toEqual({});
  });

  it('rechaza un correo de más de 254 caracteres', () => {
    const correo = `${'a'.repeat(250)}@b.co`;

    expect(validarPersona({ ...VALIDO, correo }, AL_CREAR).correo).toBe(
      'El correo supera los 254 caracteres permitidos.',
    );
  });
});

describe('validarPersona: contraseña', () => {
  it('al crear es obligatoria', () => {
    expect(validarPersona({ ...VALIDO, contrasena: '' }, AL_CREAR).contrasena).toBe(
      'La contraseña es obligatoria.',
    );
  });

  it('al editar acepta la contraseña vacía (conserva la actual)', () => {
    expect(validarPersona({ ...VALIDO, contrasena: '' }, AL_EDITAR)).toEqual({});
  });

  it('al editar, si se escribe, exige el mínimo igual que al crear', () => {
    expect(validarPersona({ ...VALIDO, contrasena: 'corta' }, AL_EDITAR).contrasena).toBe(
      'La contraseña debe tener al menos 8 caracteres.',
    );
  });

  it('rechaza 7 caracteres y acepta 8', () => {
    expect(validarPersona({ ...VALIDO, contrasena: '1234567' }, AL_CREAR).contrasena).toBe(
      'La contraseña debe tener al menos 8 caracteres.',
    );
    expect(validarPersona({ ...VALIDO, contrasena: '12345678' }, AL_CREAR)).toEqual({});
  });

  it('acepta 72 bytes y rechaza 73 (límite de bcrypt)', () => {
    expect(validarPersona({ ...VALIDO, contrasena: 'a'.repeat(72) }, AL_CREAR)).toEqual({});
    expect(validarPersona({ ...VALIDO, contrasena: 'a'.repeat(73) }, AL_CREAR).contrasena).toBe(
      'La contraseña no puede superar los 72 bytes.',
    );
  });

  it('cuenta los bytes, no los caracteres: 40 «ñ» son 80 bytes', () => {
    expect(validarPersona({ ...VALIDO, contrasena: 'ñ'.repeat(40) }, AL_CREAR).contrasena).toBe(
      'La contraseña no puede superar los 72 bytes.',
    );
  });
});

describe('errorDelServidor', () => {
  it('ubica el 409 de DNI repetido bajo DNI (CA 3)', () => {
    const mensaje = 'Ya existe un mozo con el DNI 30123456';

    expect(errorDelServidor(mensaje)).toEqual({ dni: mensaje });
  });

  it('ubica el 409 de correo repetido bajo Correo', () => {
    const mensaje = 'Ya existe un usuario con el correo ana@resto.com';

    expect(errorDelServidor(mensaje)).toEqual({ correo: mensaje });
  });

  it('deja cualquier otro mensaje como error general', () => {
    expect(errorDelServidor('No se pudo conectar con el backend')).toEqual({
      general: 'No se pudo conectar con el backend',
    });
    expect(errorDelServidor('No tiene permiso para realizar esta acción')).toEqual({
      general: 'No tiene permiso para realizar esta acción',
    });
  });
});
