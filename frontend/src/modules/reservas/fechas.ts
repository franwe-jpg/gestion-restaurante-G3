function conCeros(valor: number): string {
  return String(valor).padStart(2, '0');
}

/**
 * Fecha de hoy en la zona del navegador, como `YYYY-MM-DD`.
 * No usa `toISOString()`: en UTC-3 después de las 21:00 devolvería el día siguiente (S11).
 */
export function hoyLocal(): string {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${conCeros(ahora.getMonth() + 1)}-${conCeros(ahora.getDate())}`;
}

/** Hora actual en la zona del navegador, como `HH:MM`. */
export function horaActualLocal(): string {
  const ahora = new Date();
  return `${conCeros(ahora.getHours())}:${conCeros(ahora.getMinutes())}`;
}

/**
 * Suma (o resta, con un número negativo) días a una fecha `YYYY-MM-DD`.
 * Calcula en UTC y vuelve a texto en UTC, así que el resultado no depende de la zona del navegador.
 */
export function sumarDias(fecha: string, dias: number): string {
  const [anio = 0, mes = 1, dia = 1] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/**
 * Convierte `YYYY-MM-DD` en `DD/MM/AAAA` separando el texto: crear un `Date` con ese texto lo
 * interpreta en UTC y en UTC-3 mostraría el día anterior (S11).
 */
export function formatearFechaReserva(fecha: string): string {
  return fecha.split('-').reverse().join('/');
}
