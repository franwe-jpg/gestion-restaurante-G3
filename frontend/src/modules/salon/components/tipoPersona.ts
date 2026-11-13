/** Las personas del salón con acceso al sistema: se comparten formularios, bajas y listados. */
export type TipoPersona = 'mozo' | 'chef';

export function conInicial(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
