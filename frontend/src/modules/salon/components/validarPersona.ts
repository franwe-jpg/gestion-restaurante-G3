const DNI_VALIDO = /^\d{7,8}$/;
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const CORREO_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TELEFONO_MAXIMO = 30;
const CORREO_MAXIMO = 254;
const CONTRASENA_MINIMA = 8;
const CONTRASENA_MAXIMA_BYTES = 72; // límite de bcrypt

export interface DatosFormularioPersona {
  dni: string;
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  contrasena: string;
}

export interface OpcionesValidacion {
  /** Al crear (o al editar una persona sin usuario) la contraseña es obligatoria. */
  contrasenaObligatoria: boolean;
}

export type ErroresPersona = Partial<Record<keyof DatosFormularioPersona, string>>;

function errorDeDni(dni: string): string | undefined {
  const limpio = dni.trim();
  if (limpio === '') return 'El DNI es obligatorio.';
  if (!DNI_VALIDO.test(limpio)) return 'El DNI debe tener 7 u 8 dígitos.';
  return undefined;
}

function errorDeNombre(campo: string, valor: string): string | undefined {
  const limpio = valor.trim();
  if (limpio === '') return `${campo} es obligatorio.`;
  if (!SOLO_LETRAS.test(limpio)) return `${campo} solo debe contener letras.`;
  return undefined;
}

function errorDeTelefono(telefono: string): string | undefined {
  if (telefono.trim().length > TELEFONO_MAXIMO) {
    return `El teléfono supera los ${TELEFONO_MAXIMO} caracteres permitidos.`;
  }
  return undefined;
}

function errorDeCorreo(correo: string): string | undefined {
  const limpio = correo.trim();
  if (limpio === '') return 'El correo es obligatorio.';
  if (limpio.length > CORREO_MAXIMO) {
    return `El correo supera los ${CORREO_MAXIMO} caracteres permitidos.`;
  }
  if (!CORREO_VALIDO.test(limpio)) return 'El correo no tiene un formato válido.';
  return undefined;
}

function errorDeContrasena(contrasena: string, obligatoria: boolean): string | undefined {
  if (contrasena === '') return obligatoria ? 'La contraseña es obligatoria.' : undefined;
  const bytes = new TextEncoder().encode(contrasena).length;
  if (bytes < CONTRASENA_MINIMA) {
    return `La contraseña debe tener al menos ${CONTRASENA_MINIMA} caracteres.`;
  }
  if (bytes > CONTRASENA_MAXIMA_BYTES) {
    return `La contraseña no puede superar los ${CONTRASENA_MAXIMA_BYTES} bytes.`;
  }
  return undefined;
}

export function validarPersona(
  datos: DatosFormularioPersona,
  opciones: OpcionesValidacion,
): ErroresPersona {
  const candidatos: ErroresPersona = {
    dni: errorDeDni(datos.dni),
    nombre: errorDeNombre('El nombre', datos.nombre),
    apellido: errorDeNombre('El apellido', datos.apellido),
    telefono: errorDeTelefono(datos.telefono),
    correo: errorDeCorreo(datos.correo),
    contrasena: errorDeContrasena(datos.contrasena, opciones.contrasenaObligatoria),
  };
  return Object.fromEntries(
    Object.entries(candidatos).filter(([, mensaje]) => mensaje !== undefined),
  ) as ErroresPersona;
}

export interface ErrorDelServidor extends ErroresPersona {
  general?: string;
}

/** Ubica el 409 del correo bajo Correo y el del DNI bajo DNI; el resto va como error general. */
export function errorDelServidor(mensaje: string): ErrorDelServidor {
  if (/correo/i.test(mensaje) && /ya existe/i.test(mensaje)) return { correo: mensaje };
  if (/ya existe/i.test(mensaje)) return { dni: mensaje };
  return { general: mensaje };
}
