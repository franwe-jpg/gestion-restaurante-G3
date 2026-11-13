import { Badge } from './badge';
import type { BadgeVariant } from './badge';

interface ConfiguracionEstado {
  etiqueta: string;
  variante: BadgeVariant;
}

/**
 * Estados de negocio de todos los módulos, con el mismo texto y color en todas las pantallas.
 * La clave se normaliza a MAYÚSCULAS_CON_GUION_BAJO, así que acepta `abierta`, `ABIERTA` o
 * `En cocina` indistintamente.
 */
const ESTADOS: Record<string, ConfiguracionEstado> = {
  ABIERTA: { etiqueta: 'Abierta', variante: 'info' },
  EN_COCINA: { etiqueta: 'En cocina', variante: 'warning' },
  SERVIDA: { etiqueta: 'Servida', variante: 'success' },
  CERRADA: { etiqueta: 'Cerrada', variante: 'neutral' },
  ANULADA: { etiqueta: 'Anulada', variante: 'danger' },
  LIBRE: { etiqueta: 'Libre', variante: 'success' },
  OCUPADA: { etiqueta: 'Ocupada', variante: 'warning' },
  FUERA_DE_SERVICIO: { etiqueta: 'Fuera de servicio', variante: 'neutral' },
  RESERVADA: { etiqueta: 'Reservada', variante: 'info' },
  MANTENIMIENTO: { etiqueta: 'Mantenimiento', variante: 'danger' },
  CONFIRMADA: { etiqueta: 'Confirmada', variante: 'success' },
  PENDIENTE: { etiqueta: 'Pendiente', variante: 'warning' },
  CANCELADA: { etiqueta: 'Cancelada', variante: 'danger' },
  CUMPLIDA: { etiqueta: 'Cumplida', variante: 'success' },
  COBRADO: { etiqueta: 'Cobrado', variante: 'success' },
  PENDIENTE_PAGO: { etiqueta: 'Pendiente de pago', variante: 'warning' },
  HABILITADO: { etiqueta: 'Habilitado', variante: 'success' },
  DESHABILITADO: { etiqueta: 'Deshabilitado', variante: 'neutral' },
  ADEUDADA: { etiqueta: 'Adeudada', variante: 'danger' },
  PAGADA: { etiqueta: 'Pagada', variante: 'success' },
  ACTIVA: { etiqueta: 'Activa', variante: 'info' },
  ATENDIDA: { etiqueta: 'Atendida', variante: 'success' },
  CANCELADA_ANTICIPADA: { etiqueta: 'Cancelada anticipada', variante: 'neutral' },
  CANCELADA_POR_AUSENCIA: { etiqueta: 'Cancelada por ausencia', variante: 'danger' },
  ENTREGADO: { etiqueta: 'Entregado', variante: 'success' },
  VIGENTE: { etiqueta: 'Vigente', variante: 'success' },
  FINALIZADA: { etiqueta: 'Finalizada', variante: 'neutral' },
};

export interface StatusBadgeProps {
  estado: string;
}

function claveDeEstado(estado: string): string {
  return estado.trim().toUpperCase().replaceAll(' ', '_');
}

export function StatusBadge({ estado }: StatusBadgeProps) {
  const configuracion = ESTADOS[claveDeEstado(estado)] ?? {
    etiqueta: estado.replaceAll('_', ' '),
    variante: 'neutral' as const,
  };

  return <Badge variant={configuracion.variante}>{configuracion.etiqueta}</Badge>;
}
