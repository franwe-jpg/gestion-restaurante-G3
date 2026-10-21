import { cn } from '../../lib/utils';

export interface AvatarProps {
  nombre: string;
  src?: string;
  className?: string;
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');
}

export function Avatar({ nombre, src, className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-100 text-xs font-semibold text-amber-900',
        className,
      )}
      title={nombre}
    >
      {src ? (
        <img src={src} alt={nombre} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{iniciales(nombre)}</span>
      )}
    </span>
  );
}
