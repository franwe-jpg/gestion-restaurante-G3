import {
  Check,
  ChefHat,
  ChevronDown,
  ConciergeBell,
  KeyRound,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useId, useState } from 'react';

import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

const CONTRASENA_DEMO = 'Resto123!';

interface CredencialDemo {
  rol: string;
  correo: string;
  permisos: string;
  icono: LucideIcon;
  recomendado?: boolean;
}

// Deben coincidir con los usuarios de backend/scripts/datos_demo.py.
const CREDENCIALES: CredencialDemo[] = [
  {
    rol: 'Encargado',
    correo: 'encargado@gmail.com',
    permisos: 'Todo el sistema y reportes',
    icono: ShieldCheck,
    recomendado: true,
  },
  {
    rol: 'Mozo',
    correo: 'mozo@gmail.com',
    permisos: 'Salón, atención, reservas y pagos',
    icono: ConciergeBell,
  },
  { rol: 'Chef', correo: 'chef@gmail.com', permisos: 'Carta, menús y comandas', icono: ChefHat },
];

export interface CredencialesPruebaProps {
  onElegir: (correo: string, contrasena: string) => void;
  correo?: string;
}

interface FilaCredencialProps {
  credencial: CredencialDemo;
  seleccionada: boolean;
  onElegir: (correo: string, contrasena: string) => void;
}

function FilaCredencial({ credencial, seleccionada, onElegir }: FilaCredencialProps) {
  const Icono = credencial.icono;
  return (
    <li>
      <button
        type="button"
        aria-label={`Usar credenciales de ${credencial.rol}`}
        aria-pressed={seleccionada}
        onClick={() => onElegir(credencial.correo, CONTRASENA_DEMO)}
        className={cn(
          'flex min-h-16 w-full items-center gap-3 rounded-md border border-transparent p-2.5 text-left transition-colors hover:bg-slate-50',
          seleccionada && 'border-brand-border bg-brand-subtle hover:bg-brand-subtle',
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-subtle">
          <Icono className="h-4 w-4 text-brand" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{credencial.rol}</span>
            {credencial.recomendado && (
              <Badge
                variant="brand"
                className="rounded-full px-2 text-[11px] font-semibold text-primary-strong"
              >
                Recomendado
              </Badge>
            )}
          </span>
          <span className="truncate font-mono text-xs text-slate-700">{credencial.correo}</span>
          <span className="text-xs text-slate-600">{credencial.permisos}</span>
        </span>
        {seleccionada && (
          <Check className="h-4 w-4 shrink-0 text-brand" role="img" aria-label="Seleccionado" />
        )}
      </button>
    </li>
  );
}

export function CredencialesPrueba({ onElegir, correo }: CredencialesPruebaProps) {
  const [abierto, setAbierto] = useState(false);
  const idCuerpo = useId();
  const correoActual = correo?.trim();

  return (
    <aside className="w-full max-w-sm overflow-hidden rounded-lg border border-t-[3px] border-slate-200 border-t-brand bg-white shadow-xs">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={idCuerpo}
        onClick={() => setAbierto((valor) => !valor)}
        className="flex min-h-12 w-full items-center gap-2 px-4 text-left transition-colors hover:bg-slate-50"
      >
        <KeyRound className="h-[18px] w-[18px] text-brand" aria-hidden="true" />
        <span className="flex-1 text-[15px] font-semibold text-slate-900">
          Credenciales de prueba
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-slate-500 transition-transform', abierto && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      <div
        id={idCuerpo}
        hidden={!abierto}
        className="flex flex-col gap-4 border-t border-slate-100 p-4"
      >
        <p className="text-[13px] text-slate-600">
          La contraseña es{' '}
          <span className="font-mono font-medium text-slate-900">{CONTRASENA_DEMO}</span> en todos
          los casos. Tocá una fila para completar el formulario.
        </p>
        <ul className="flex flex-col gap-1">
          {CREDENCIALES.map((credencial) => (
            <FilaCredencial
              key={credencial.correo}
              credencial={credencial}
              seleccionada={correoActual === credencial.correo}
              onElegir={onElegir}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}
