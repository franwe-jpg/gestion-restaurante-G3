const DNI_VALIDO = /^\d{7,8}$/;
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const TELEFONO_MAXIMO = 30;

export interface DatosFormularioMozo {
  dni: string;
  nombre: string;
  apellido: string;
  telefono: string;
}

export type ErroresMozo = Partial<Record<keyof DatosFormularioMozo, string>>;

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

export function validarMozo(datos: DatosFormularioMozo): ErroresMozo {
  const errores: ErroresMozo = {};
  const dni = errorDeDni(datos.dni);
  const nombre = errorDeNombre('El nombre', datos.nombre);
  const apellido = errorDeNombre('El apellido', datos.apellido);
  const telefono = errorDeTelefono(datos.telefono);
  if (dni) errores.dni = dni;
  if (nombre) errores.nombre = nombre;
  if (apellido) errores.apellido = apellido;
  if (telefono) errores.telefono = telefono;
  return errores;
}

export interface ErrorDelServidor extends ErroresMozo {
  general?: string;
}

/** Ubica el 409 del DNI repetido bajo DNI; el resto va como error general. */
export function errorDelServidor(mensaje: string): ErrorDelServidor {
  if (/ya existe/i.test(mensaje)) return { dni: mensaje };
  return { general: mensaje };
}
