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
