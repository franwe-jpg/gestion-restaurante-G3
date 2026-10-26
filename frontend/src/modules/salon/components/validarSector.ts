export const NOMBRE_SECTOR_MAXIMO = 30;
export const DESCRIPCION_SECTOR_MAXIMA = 200;

export interface DatosFormularioSector {
  nombre: string;
  descripcion: string;
}

export type ErroresSector = Partial<Record<keyof DatosFormularioSector, string>>;

function errorDeNombre(nombre: string): string | undefined {
  const limpio = nombre.trim();
  if (limpio === '') return 'El nombre es obligatorio.';
  if (limpio.length > NOMBRE_SECTOR_MAXIMO) {
    return `El nombre supera los ${NOMBRE_SECTOR_MAXIMO} caracteres permitidos.`;
  }
  return undefined;
}

function errorDeDescripcion(descripcion: string): string | undefined {
  if (descripcion.trim().length > DESCRIPCION_SECTOR_MAXIMA) {
    return `La descripción supera los ${DESCRIPCION_SECTOR_MAXIMA} caracteres permitidos.`;
  }
  return undefined;
}

export function validarSector(datos: DatosFormularioSector): ErroresSector {
  const errores: ErroresSector = {};
  const nombre = errorDeNombre(datos.nombre);
  const descripcion = errorDeDescripcion(datos.descripcion);
  if (nombre) errores.nombre = nombre;
  if (descripcion) errores.descripcion = descripcion;
  return errores;
}

export interface ErrorDelServidor extends ErroresSector {
  general?: string;
}

/** Ubica el mensaje de un 409 bajo el campo Nombre; el resto va como error general. */
export function errorDelServidor(mensaje: string): ErrorDelServidor {
  if (/ya existe/i.test(mensaje)) return { nombre: 'Ya existe un sector con ese nombre.' };
  return { general: mensaje };
}
