import type { BadgeVariant } from '../../../shared/components/ui/badge';
import type { EstadoReserva } from '../types';

interface PresentacionEstado {
  etiqueta: string;
  variante: BadgeVariant;
}

/** Texto y variante de cada estado, con los colores de la maqueta (Decisión 12, S12). */
export const ESTADOS_RESERVA: Record<EstadoReserva, PresentacionEstado> = {
  ACTIVA: { etiqueta: 'Activa', variante: 'info' },
  ATENDIDA: { etiqueta: 'Atendida', variante: 'success' },
  CANCELADA_ANTICIPADA: { etiqueta: 'Cancelada anticipada', variante: 'neutral' },
  CANCELADA_POR_AUSENCIA: { etiqueta: 'Cancelada por ausencia', variante: 'danger' },
};
