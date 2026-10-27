export interface ValoresMenuDelDia {
  nombre: string;
  seccionId: number | null;
  precio: string;
  ingredientes: string[];
  etiquetas: string[];
  descripcion: string;
}

export interface ErroresMenuDelDia {
  nombre?: string;
  seccionId?: string;
  precio?: string;
  ingredientes?: string;
  etiquetas?: string;
  descripcion?: string;
}

/**
 * Convierte el precio escrito a la forma que espera la API ("9900.50") o devuelve null.
 * Acepta coma decimal ("9.900,50") y punto decimal ("9900.5"); con tres dígitos después del
 * último punto lo interpreta como separador de miles ("9.900"). HU-M2-04, CA 5.
 */
export function normalizarPrecio(texto: string): string | null {
  const limpio = texto.trim();
  if (!/^[\d.,]+$/.test(limpio)) return null;

  const partes = limpio.split('.');
  const ultima = partes[partes.length - 1] ?? '';
  const decimalConPunto = !limpio.includes(',') && partes.length > 1 && ultima.length <= 2;
  const numeroTexto = limpio.includes(',')
    ? limpio.replace(/\./g, '').replace(',', '.')
    : decimalConPunto
      ? `${partes.slice(0, -1).join('')}.${ultima}`
      : limpio.replace(/\./g, '');

  if (!/^\d+(\.\d{1,2})?$/.test(numeroTexto)) return null;
  const numero = Number(numeroTexto);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return numero.toFixed(2);
}

/** Validación local antes de enviar: evita un viaje por cada error de forma (HU-M2-04). */
export function validarMenuDelDia(valores: ValoresMenuDelDia): ErroresMenuDelDia {
  const errores: ErroresMenuDelDia = {};

  if (valores.nombre.trim() === '') errores.nombre = 'El nombre es obligatorio.';
  else if (valores.nombre.trim().length > 100)
    errores.nombre = 'El nombre admite hasta 100 caracteres.';

  if (valores.seccionId === null) errores.seccionId = 'Elegí una sección habilitada.';

  if (normalizarPrecio(valores.precio) === null) {
    errores.precio = 'El precio debe ser mayor a cero y tener hasta 2 decimales.';
  }

  if (valores.ingredientes.length === 0) {
    errores.ingredientes = 'Agregá al menos un ingrediente.';
  }

  if (valores.descripcion.length > 500) {
    errores.descripcion = 'La descripción admite hasta 500 caracteres.';
  }

  return errores;
}
