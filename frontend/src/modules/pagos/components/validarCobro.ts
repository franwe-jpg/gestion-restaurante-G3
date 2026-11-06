const IMPORTE_VALIDO = /^\d+([.,]\d{1,2})?$/;

/** Lleva "1500,5" a "1500.50", el formato que espera la API. */
export function normalizarImporte(texto: string): string {
  const [enteros = '', decimales = ''] = texto.trim().replace(',', '.').split('.');
  return `${enteros}.${decimales.padEnd(2, '0')}`;
}

function aCentavos(importe: string): number {
  return Math.round(Number(normalizarImporte(importe)) * 100);
}

/** HU-M6-01: el primer cobro es mayor a cero y no supera el total de la factura. */
export function validarImporte(texto: string, total: string): string | undefined {
  const limpio = texto.trim();
  if (!IMPORTE_VALIDO.test(limpio)) return 'Ingresá un importe válido, con hasta 2 decimales.';
  const centavos = aCentavos(limpio);
  if (centavos <= 0) return 'El importe debe ser mayor a cero.';
  if (centavos > aCentavos(total)) return 'El importe no puede superar el total de la factura.';
  return undefined;
}
