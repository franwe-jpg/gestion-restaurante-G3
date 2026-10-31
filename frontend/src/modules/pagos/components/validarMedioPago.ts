import type { TipoMedioPago } from '../types';

export const NOMBRE_MEDIO_PAGO_MINIMO = 3;
export const NOMBRE_MEDIO_PAGO_MAXIMO = 50;
export const DESCRIPCION_MEDIO_PAGO_MAXIMA = 200;
// Letras (con acentos y ñ), números, espacios, punto y guion (CA 5 de #74).
const CARACTERES_PERMITIDOS = /^[\p{L}\p{N} .-]+$/u;

/** Etiquetas de los tipos en el orden de la maqueta. */
export const TIPOS_MEDIO_PAGO: { valor: TipoMedioPago; etiqueta: string }[] = [
  { valor: 'BILLETERA_VIRTUAL', etiqueta: 'Billetera virtual' },
  { valor: 'EFECTIVO', etiqueta: 'Efectivo' },
  { valor: 'TARJETA', etiqueta: 'Tarjeta' },
  { valor: 'TRANSFERENCIA', etiqueta: 'Transferencia' },
];

export function etiquetaDelTipo(tipo: TipoMedioPago): string {
  return TIPOS_MEDIO_PAGO.find((opcion) => opcion.valor === tipo)?.etiqueta ?? tipo;
}

export interface DatosFormularioMedioPago {
  nombre: string;
  tipo: TipoMedioPago | '';
  descripcion: string;
}

export type ErroresMedioPago = Partial<Record<keyof DatosFormularioMedioPago, string>>;

function errorDeNombre(nombre: string): string | undefined {
  const limpio = nombre.trim();
  if (limpio === '') return 'El nombre es obligatorio.';
  if (limpio.length < NOMBRE_MEDIO_PAGO_MINIMO || limpio.length > NOMBRE_MEDIO_PAGO_MAXIMO) {
    return `El nombre debe tener entre ${NOMBRE_MEDIO_PAGO_MINIMO} y ${NOMBRE_MEDIO_PAGO_MAXIMO} caracteres.`;
  }
  if (!CARACTERES_PERMITIDOS.test(limpio)) {
    return 'El nombre solo admite letras, números, espacios, punto y guion.';
  }
  return undefined;
}

export function validarMedioPago(datos: DatosFormularioMedioPago): ErroresMedioPago {
  const errores: ErroresMedioPago = {};
  const nombre = errorDeNombre(datos.nombre);
  if (nombre) errores.nombre = nombre;
  if (datos.tipo === '') errores.tipo = 'El tipo es obligatorio.';
  if (datos.descripcion.trim().length > DESCRIPCION_MEDIO_PAGO_MAXIMA) {
    errores.descripcion = `La descripción supera los ${DESCRIPCION_MEDIO_PAGO_MAXIMA} caracteres permitidos.`;
  }
  return errores;
}

export interface ErrorDelServidor extends ErroresMedioPago {
  general?: string;
}

/** Ubica el 409 bajo el campo Nombre; el resto va como error general. */
export function errorDelServidor(mensaje: string): ErrorDelServidor {
  if (/ya existe/i.test(mensaje)) return { nombre: mensaje };
  return { general: mensaje };
}
