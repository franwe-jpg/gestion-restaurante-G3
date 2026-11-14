import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export type ButtonVariant =
  'default' | 'secondary' | 'outline' | 'brand-outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'default', size = 'md', type = 'button', disabled, children, ...props },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors select-none whitespace-nowrap rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:saturate-0';

    const variantStyles: Record<ButtonVariant, string> = {
      default:
        'bg-brand text-brand-foreground enabled:hover:bg-brand-hover dark:ring-1 dark:ring-inset dark:ring-white/15',
      secondary: 'bg-secondary text-secondary-foreground enabled:hover:bg-secondary-hover',
      outline:
        'border border-slate-300 bg-white text-slate-700 enabled:hover:bg-slate-50 enabled:hover:text-slate-900',
      'brand-outline':
        'border border-brand/60 bg-transparent text-brand enabled:hover:border-brand enabled:hover:bg-brand/10 enabled:hover:text-brand-hover dark:border-brand/40 dark:bg-transparent dark:text-primary-strong dark:enabled:hover:border-brand/60 dark:enabled:hover:bg-brand/15 dark:enabled:hover:text-primary-strong',
      ghost: 'text-slate-700 enabled:hover:bg-slate-100 enabled:hover:text-slate-900',
      danger:
        'bg-danger text-danger-foreground enabled:hover:bg-danger-hover dark:ring-1 dark:ring-inset dark:ring-white/15',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-9 px-4 py-2 text-sm gap-2',
      lg: 'h-11 px-6 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
