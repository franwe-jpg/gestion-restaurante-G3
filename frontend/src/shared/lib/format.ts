export function formatearMoneda(valor: number, moneda = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 2,
  }).format(valor);
}

function aFecha(valor: string | number | Date): Date | null {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function formatearFecha(valor: string | number | Date): string {
  const fecha = aFecha(valor);
  if (!fecha) return '-';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' }).format(fecha);
}

export function formatearHora(valor: string | number | Date): string {
  const fecha = aFecha(valor);
  if (!fecha) return '-';
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(fecha);
}

export function formatearNumero(valor: number): string {
  return new Intl.NumberFormat('es-AR').format(valor);
}
