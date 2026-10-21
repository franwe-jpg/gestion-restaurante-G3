import React from 'react';
import { cn } from '../../lib/utils';

export function List({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul role="list" className={cn('divide-y divide-slate-100', className)} {...props} />;
}

export function ListItem({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 py-3 transition-colors hover:bg-slate-50/60 px-2 rounded-md',
        className,
      )}
      {...props}
    />
  );
}

export function ListIcon({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ListContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-w-0 flex-1', className)} {...props} />;
}

export function ListTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h4 className={cn('text-sm font-medium text-slate-900 truncate', className)} {...props} />;
}

export function ListDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-slate-500 truncate', className)} {...props} />;
}
