import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant = 'neutral' | 'brand' | 'success' | 'danger' | 'warning' | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'neutral', children, ...props }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    brand: 'bg-brand-subtle text-brand border-brand-border',
    success: 'bg-success-subtle text-success-strong border-success-border',
    danger: 'bg-danger-subtle text-danger-strong border-danger-border',
    warning: 'bg-warning-subtle text-warning-strong border-warning-border',
    info: 'bg-info-subtle text-info-strong border-info-border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border whitespace-nowrap',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
