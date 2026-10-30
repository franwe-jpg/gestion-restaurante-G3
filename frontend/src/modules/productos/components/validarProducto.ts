import type { ConfiguracionAlta } from '../categorias';

export const NOMBRE_PRODUCTO_MAXIMO = 100;
export const DESCRIPCION_MAXIMA = 500;
export const INGREDIENTE_MAXIMO = 100;
export const ETIQUETA_MAXIMA = 30;
export const INGREDIENTES_TOPE = 50;
export const ETIQUETAS_TOPE = 20;

const PRECIO_CON_MILES = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$/;
const PRECIO_SIN_MILES = /^\d+(,\d{1,2})?$/;
const ENTEROS_MAXIMOS = 8;

export interface DatosFormularioProducto {
  nombre: string;
  seccionId: string;
  precio: string;
  ingredientes: string[];
  descripcion: string;
}

export type ErroresProducto = Partial<
  Record<'nombre' | 'seccionId' | 'precio' | 'ingredientes' | 'descripcion', string>
>;

/** Convierte "12.500,50" en "12500.50". Devuelve null si no es un precio válido mayor a cero. */
export function convertirPrecio(texto: string): string | null {
  const limpio = texto.trim();
  if (!PRECIO_CON_MILES.test(limpio) && !PRECIO_SIN_MILES.test(limpio)) return null;
  const normalizado = limpio.replaceAll('.', '').replace(',', '.');
  const enteros = normalizado.split('.')[0] ?? '';
  if (enteros.length > ENTEROS_MAXIMOS || Number(normalizado) <= 0) return null;
  return normalizado;
}

/** Convierte "12500.50" (API) en "12.500,50" (formulario); es la inversa de `convertirPrecio`. */
export function precioParaEditar(precio: string): string {
  const [enteros = '', decimales] = precio.split('.');
  const conMiles = enteros.replace(/\B(?=(\d{3})+$)/g, '.');
  return decimales === undefined ? conMiles : `${conMiles},${decimales}`;
}

function errorDeNombre(nombre: string): string | undefined {
  const limpio = nombre.trim();
  if (limpio === '') return 'El nombre es obligatorio.';
  if (limpio.length > NOMBRE_PRODUCTO_MAXIMO) {
    return `El nombre supera los ${NOMBRE_PRODUCTO_MAXIMO} caracteres permitidos.`;
  }
  return undefined;
}

function errorDePrecio(precio: string): string | undefined {
  if (precio.trim() === '') return 'El precio es obligatorio.';
  if (convertirPrecio(precio) === null) {
    return 'El precio es inválido. Ingrese un número mayor a cero, por ejemplo 12.500,50.';
  }
  return undefined;
}

function errorDeDescripcion(descripcion: string): string | undefined {
  if (descripcion.trim().length > DESCRIPCION_MAXIMA) {
    return `La descripción supera los ${DESCRIPCION_MAXIMA} caracteres permitidos.`;
  }
  return undefined;
}

export function validarProducto(
  datos: DatosFormularioProducto,
  { ingredientesObligatorios }: Pick<ConfiguracionAlta, 'ingredientesObligatorios'>,
): ErroresProducto {
  const errores: ErroresProducto = {};
  const nombre = errorDeNombre(datos.nombre);
  const precio = errorDePrecio(datos.precio);
  const descripcion = errorDeDescripcion(datos.descripcion);
  if (nombre) errores.nombre = nombre;
  if (datos.seccionId === '') errores.seccionId = 'La sección es obligatoria.';
  if (precio) errores.precio = precio;
  if (ingredientesObligatorios && datos.ingredientes.length === 0)
    errores.ingredientes = 'Agregue al menos un ingrediente.';
  if (descripcion) errores.descripcion = descripcion;
  return errores;
}

export interface ErrorDelServidor extends ErroresProducto {
  general?: string;
}

/** Ubica el mensaje de un 409 bajo el campo que corresponde; el resto va como error general. */
export function errorDelServidor(
  mensaje: string,
  configuracion: Pick<ConfiguracionAlta, 'nombreRepetido'>,
): ErrorDelServidor {
  if (/ya está registrad[oa]/i.test(mensaje)) return { nombre: configuracion.nombreRepetido };
  if (/sección .* deshabilitada/i.test(mensaje)) {
    return { seccionId: 'La sección elegida está deshabilitada.' };
  }
  return { general: mensaje };
}
