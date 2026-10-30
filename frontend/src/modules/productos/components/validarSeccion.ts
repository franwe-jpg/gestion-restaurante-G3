export const NOMBRE_SECCION_MAXIMO = 50;

export interface DatosFormularioSeccion {
  nombre: string;
  orden: string;
}

export type ErroresSeccion = Partial<Record<keyof DatosFormularioSeccion, string>>;

const ENTERO_POSITIVO = /^[1-9]\d*$/;

function errorDeNombre(nombre: string): string | undefined {
  const limpio = nombre.trim();
  if (limpio === '') return 'El nombre es obligatorio.';
  if (limpio.length > NOMBRE_SECCION_MAXIMO) {
    return `El nombre supera los ${NOMBRE_SECCION_MAXIMO} caracteres permitidos.`;
  }
  return undefined;
}

function errorDeOrden(orden: string): string | undefined {
  const limpio = orden.trim();
  if (limpio === '') return 'El orden es obligatorio.';
  if (!ENTERO_POSITIVO.test(limpio)) return 'El orden debe ser un número entero mayor a cero.';
  return undefined;
}

export function validarSeccion(datos: DatosFormularioSeccion): ErroresSeccion {
  const errores: ErroresSeccion = {};
  const nombre = errorDeNombre(datos.nombre);
  const orden = errorDeOrden(datos.orden);
  if (nombre) errores.nombre = nombre;
  if (orden) errores.orden = orden;
  return errores;
}

export interface ErrorDelServidor extends ErroresSeccion {
  general?: string;
}

/** Ubica el mensaje de un 409 bajo el campo que corresponde; el resto va como error general. */
export function errorDelServidor(mensaje: string): ErrorDelServidor {
  if (/ya existe/i.test(mensaje)) return { nombre: 'Ya existe una sección con ese nombre.' };
  if (/posición ocupada/i.test(mensaje)) {
    return { orden: 'Esa posición está ocupada por otra sección habilitada.' };
  }
  return { general: mensaje };
}
