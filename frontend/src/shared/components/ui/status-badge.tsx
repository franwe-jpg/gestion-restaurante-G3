import { Badge } from './badge';
import type { BadgeVariant } from './badge';

interface ConfiguracionEstado {
  etiqueta: string;
  variante: BadgeVariant;
}

const ESTADOS: Record<string, ConfiguracionEstado> = {
  abierta: { etiqueta: 'Abierta', variante: 'info' },
  en_cocina: { etiqueta: 'En cocina', variante: 'warning' },
  servida: { etiqueta: 'Servida', variante: 'success' },
  cerrada: { etiqueta: 'Cerrada', variante: 'neutral' },
  libre: { etiqueta: 'Libre', variante: 'success' },
  ocupada: { etiqueta: 'Ocupada', variante: 'warning' },
  reservada: { etiqueta: 'Reservada', variante: 'info' },
  mantenimiento: { etiqueta: 'Mantenimiento', variante: 'danger' },
  confirmada: { etiqueta: 'Confirmada', variante: 'success' },
  pendiente: { etiqueta: 'Pendiente', variante: 'warning' },
  cancelada: { etiqueta: 'Cancelada', variante: 'danger' },
  cumplida: { etiqueta: 'Cumplida', variante: 'success' },
  cobrado: { etiqueta: 'Cobrado', variante: 'success' },
  pendiente_pago: { etiqueta: 'Pendiente de pago', variante: 'warning' },
};

export interface StatusBadgeProps {
  estado: string;
}

export function StatusBadge({ estado }: StatusBadgeProps) {
  const configuracion = ESTADOS[estado] ?? {
    etiqueta: estado.replaceAll('_', ' '),
    variante: 'neutral' as const,
  };

  return <Badge variant={configuracion.variante}>{configuracion.etiqueta}</Badge>;
}
