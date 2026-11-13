import { CreditCard, Pencil, Trash2 } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import { StatusBadge } from '../../../shared/components/ui/status-badge';
import type { MedioPago } from '../types';

import { etiquetaDelTipo } from './validarMedioPago';

export interface MediosPagoTablaProps {
  mediosPago: MedioPago[];
  mensajeVacio: string;
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  /** Sin `onEditar` y `onEliminar` (rol sin `PAGOS_GESTIONAR`) no hay columna de acciones. */
  onEditar?: (medioPago: MedioPago) => void;
  onEliminar?: (medioPago: MedioPago) => void;
}

interface Acciones {
  onEditar: (medioPago: MedioPago) => void;
  onEliminar: (medioPago: MedioPago) => void;
}

function AccionesMedioPago({
  medioPago,
  onEditar,
  onEliminar,
}: Acciones & { medioPago: MedioPago }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Editar «${medioPago.nombre}»`}
        title={`Editar «${medioPago.nombre}»`}
        onClick={() => onEditar(medioPago)}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Editar</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Eliminar «${medioPago.nombre}»`}
        title={`Eliminar «${medioPago.nombre}»`}
        onClick={() => onEliminar(medioPago)}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Eliminar</span>
      </Button>
    </div>
  );
}

function columnas(acciones?: Acciones): ColumnaTabla<MedioPago>[] {
  const base: ColumnaTabla<MedioPago>[] = [
    {
      clave: 'nombre',
      encabezado: 'Nombre',
      render: (medio) => <span className="font-medium">{medio.nombre}</span>,
    },
    { clave: 'tipo', encabezado: 'Tipo', render: (medio) => etiquetaDelTipo(medio.tipo) },
    {
      clave: 'descripcion',
      encabezado: 'Descripción',
      render: (medio) => medio.descripcion ?? <span className="text-slate-400">—</span>,
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (medio) => <StatusBadge estado={medio.estado} />,
    },
  ];
  if (!acciones) return base;
  return [
    ...base,
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      render: (medio) => <AccionesMedioPago medioPago={medio} {...acciones} />,
      className: 'w-24',
    },
  ];
}

/** HU-M6-07: tabla de medios de pago en el orden que devuelve el backend (por nombre). */
export function MediosPagoTabla({
  mediosPago,
  mensajeVacio,
  cargando = false,
  error = null,
  onReintentar,
  onEditar,
  onEliminar,
}: MediosPagoTablaProps) {
  return (
    <DataTable
      columnas={columnas(onEditar && onEliminar ? { onEditar, onEliminar } : undefined)}
      filas={mediosPago}
      obtenerClave={(medio) => medio.id}
      cargando={cargando}
      error={error}
      onReintentar={onReintentar}
      vacio={
        <EmptyState
          icono={CreditCard}
          titulo={mensajeVacio}
          descripcion="Agregá uno con «Nuevo medio de pago»."
        />
      }
    />
  );
}
