import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

import { cn } from '../../lib/utils';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  variant?: AlertVariant;
  titulo?: string;
  children: ReactNode;
  className?: string;
}

const ESTILOS: Record<AlertVariant, string> = {
  info: 'border-info-border bg-info-subtle text-info-strong',
  success: 'border-success-border bg-success-subtle text-success-strong',
  warning: 'border-warning-border bg-warning-subtle text-warning-strong',
  danger: 'border-danger-border bg-danger-subtle text-danger-strong',
};

const ICONOS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export function Alert({ variant = 'info', titulo, children, className }: AlertProps) {
  const Icono = ICONOS[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-md border p-4 text-sm',
        ESTILOS[variant],
        className,
      )}
    >
      <Icono className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        {titulo && <p className="font-semibold">{titulo}</p>}
        <div className="opacity-90">{children}</div>
      </div>
    </div>
  );
}
