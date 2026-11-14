/** Una línea del modal tal como la completa la persona: todo texto, se convierte al enviar. */
export interface LineaEscrita {
  /** Identifica la línea mientras exista; no cambia al quitar otras (HU-M5-06). */
  clave: number;
  /** `id` del producto elegido en el desplegable como texto, o `''` si no se eligió ninguno. */
  producto: string;
  cantidad: string;
}

/** Un error por campo de la línea; solo figura el campo que falla. */
export type ErroresDeLinea = Partial<Record<'producto' | 'cantidad', string>>;

/** Errores por la `clave` de la línea; las líneas sin errores no figuran. */
export type ErroresDeLineas = Record<number, ErroresDeLinea>;

const ENTERO_POSITIVO = /^[1-9]\d*$/;

const ERROR_PRODUCTO = 'Seleccione un producto';
const ERROR_CANTIDAD = 'La cantidad debe ser un número entero mayor que cero';

function errorDeEntero(valor: string, mensaje: string): string | undefined {
  return ENTERO_POSITIVO.test(valor.trim()) ? undefined : mensaje;
}

/** El producto sale de un desplegable: solo se exige que se haya elegido uno. */
function errorDeProducto(producto: string): string | undefined {
  return producto.trim() === '' ? ERROR_PRODUCTO : undefined;
}

function erroresDeLinea({ producto, cantidad }: LineaEscrita): ErroresDeLinea {
  const encontrados: ErroresDeLinea = {
    producto: errorDeProducto(producto),
    cantidad: errorDeEntero(cantidad, ERROR_CANTIDAD),
  };
  return Object.fromEntries(
    Object.entries(encontrados).filter(([, mensaje]) => mensaje !== undefined),
  );
}

/**
 * Valida cada línea antes de enviar (S64): debe haber un producto elegido y la cantidad debe ser un
 * entero mayor que cero. Es solo una ayuda para no hacer un viaje inútil: la API sigue siendo la
 * autoridad.
 */
export function validarComandaDesdeReserva(lineas: LineaEscrita[]): ErroresDeLineas {
  const errores: ErroresDeLineas = {};
  for (const linea of lineas) {
    const deLinea = erroresDeLinea(linea);
    if (Object.keys(deLinea).length > 0) errores[linea.clave] = deLinea;
  }
  return errores;
}
