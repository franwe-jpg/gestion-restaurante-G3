import { CreditCard, Pencil, Trash2 } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import type { MedioPago } from '../types';

import { etiquetaDelTipo } from './validarMedioPago';

export interface MediosPagoTablaProps {
  mediosPago: MedioPago[];
  mensajeVacio: string;
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onEditar: (medioPago: MedioPago) => void;
  onEliminar: (medioPago: MedioPago) => void;
}

type Acciones = Pick<MediosPagoTablaProps, 'onEditar' | 'onEliminar'>;

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
        onClick={() => onEditar(medioPago)}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Editar</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Eliminar «${medioPago.nombre}»`}
        onClick={() => onEliminar(medioPago)}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Eliminar</span>
      </Button>
    </div>
  );
}

function columnas({ onEditar, onEliminar }: Acciones): ColumnaTabla<MedioPago>[] {
  return [
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
      render: (medio) => (
        <Badge variant={medio.estado === 'HABILITADO' ? 'success' : 'neutral'}>
          {medio.estado === 'HABILITADO' ? 'Habilitado' : 'Deshabilitado'}
        </Badge>
      ),
    },
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      render: (medio) => (
        <AccionesMedioPago medioPago={medio} onEditar={onEditar} onEliminar={onEliminar} />
      ),
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
      columnas={columnas({ onEditar, onEliminar })}
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
