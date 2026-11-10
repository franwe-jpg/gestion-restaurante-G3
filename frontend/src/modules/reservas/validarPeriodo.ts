/** Devuelve el mensaje de error del período, o `null` si se puede consultar (HU-M5-07). */
export function validarPeriodo(desde: string, hasta: string): string | null {
  if (!desde && !hasta) return 'Faltan la fecha desde y la fecha hasta.';
  if (!desde) return 'Falta la fecha desde.';
  if (!hasta) return 'Falta la fecha hasta.';
  if (desde > hasta) {
    return 'El período es inválido: la fecha desde es posterior a la fecha hasta.';
  }
  return null;
}
