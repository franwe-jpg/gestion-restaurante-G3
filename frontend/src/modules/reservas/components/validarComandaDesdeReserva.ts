/** Una línea del modal tal como la escribe la persona: todo texto, se convierte al enviar. */
export interface LineaEscrita {
  /** Identifica la línea mientras exista; no cambia al quitar otras (HU-M5-06). */
  clave: number;
  producto: string;
  cantidad: string;
}

/** Un error por campo de la línea; solo figura el campo que falla. */
export type ErroresDeLinea = Partial<Record<'producto' | 'cantidad', string>>;

/** Errores por la `clave` de la línea; las líneas sin errores no figuran. */
export type ErroresDeLineas = Record<number, ErroresDeLinea>;

const ENTERO_POSITIVO = /^[1-9]\d*$/;

const ERROR_PRODUCTO = 'El producto debe ser un número entero mayor que cero';
const ERROR_CANTIDAD = 'La cantidad debe ser un número entero mayor que cero';

function errorDeEntero(valor: string, mensaje: string): string | undefined {
  return ENTERO_POSITIVO.test(valor.trim()) ? undefined : mensaje;
}

function erroresDeLinea({ producto, cantidad }: LineaEscrita): ErroresDeLinea {
  const encontrados: ErroresDeLinea = {
    producto: errorDeEntero(producto, ERROR_PRODUCTO),
    cantidad: errorDeEntero(cantidad, ERROR_CANTIDAD),
  };
  return Object.fromEntries(
    Object.entries(encontrados).filter(([, mensaje]) => mensaje !== undefined),
  );
}

/**
 * Valida cada línea antes de enviar (S64): producto y cantidad deben ser enteros mayores que cero.
 * Es solo una ayuda para no hacer un viaje inútil: la API sigue siendo la autoridad.
 */
export function validarComandaDesdeReserva(lineas: LineaEscrita[]): ErroresDeLineas {
  const errores: ErroresDeLineas = {};
  for (const linea of lineas) {
    const deLinea = erroresDeLinea(linea);
    if (Object.keys(deLinea).length > 0) errores[linea.clave] = deLinea;
  }
  return errores;
}
