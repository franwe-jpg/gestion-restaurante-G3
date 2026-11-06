/** Convierte `YYYY-MM-DD` en `dd/mm/aaaa` sin pasar por `Date` (evita corrimientos de día por zona horaria). */
export function formatearFechaIso(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function formatearPeriodo(desde: string, hasta: string): string {
  return `Del ${formatearFechaIso(desde)} al ${formatearFechaIso(hasta)}`;
}
