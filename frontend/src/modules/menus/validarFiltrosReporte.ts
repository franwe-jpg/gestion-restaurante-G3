/** Devuelve el mensaje del primer filtro faltante o inválido, o `null` si se puede consultar. */
export function validarFiltrosReporte(
  desde: string,
  hasta: string,
  promocionId: string,
): string | null {
  if (!desde && !hasta) return 'Faltan la fecha desde y la fecha hasta.';
  if (!desde) return 'Falta la fecha desde.';
  if (!hasta) return 'Falta la fecha hasta.';
  if (desde > hasta) {
    return 'El período es inválido: la fecha desde es posterior a la fecha hasta.';
  }
  if (!promocionId) return 'Falta seleccionar la promoción.';
  return null;
}
