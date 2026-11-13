import { Pencil, Trash2, Users } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import { StatusBadge } from '../../../shared/components/ui/status-badge';
import type { Persona } from '../types';

import type { TipoPersona } from './tipoPersona';

export interface PersonasTablaProps {
  tipo: TipoPersona;
  personas: Persona[];
  descripcionVacia: string;
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onEditar: (persona: Persona) => void;
  onEliminar: (persona: Persona) => void;
}

interface AccionesPersonaProps {
  tipo: TipoPersona;
  persona: Persona;
  onEditar: (persona: Persona) => void;
  onEliminar: (persona: Persona) => void;
}

function AccionesPersona({ tipo, persona, onEditar, onEliminar }: AccionesPersonaProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Editar el ${tipo} ${persona.dni}`}
        title={`Editar el ${tipo} ${persona.dni}`}
        onClick={() => onEditar(persona)}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Editar</span>
      </Button>
      {persona.estado === 'HABILITADO' && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Dar de baja al ${tipo} ${persona.dni}`}
          title={`Dar de baja al ${tipo} ${persona.dni}`}
          onClick={() => onEliminar(persona)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Dar de baja</span>
        </Button>
      )}
    </div>
  );
}

function columnas(
  tipo: TipoPersona,
  onEditar: (persona: Persona) => void,
  onEliminar: (persona: Persona) => void,
): ColumnaTabla<Persona>[] {
  return [
    { clave: 'dni', encabezado: 'DNI', render: (persona) => persona.dni },
    {
      clave: 'nombre',
      encabezado: 'Apellido y nombre',
      render: (persona) => `${persona.apellido}, ${persona.nombre}`,
    },
    {
      clave: 'telefono',
      encabezado: 'Teléfono',
      render: (persona) => persona.telefono ?? <span className="text-slate-400">—</span>,
    },
    {
      clave: 'correo',
      encabezado: 'Correo',
      render: (persona) => persona.correo ?? <span className="text-slate-500">Sin usuario</span>,
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (persona) => <StatusBadge estado={persona.estado} />,
    },
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      render: (persona) => (
        <AccionesPersona
          tipo={tipo}
          persona={persona}
          onEditar={onEditar}
          onEliminar={onEliminar}
        />
      ),
      className: 'w-24',
    },
  ];
}

/** Tabla de mozos o chefs: DNI, nombre, teléfono, correo del usuario y estado. */
export function PersonasTabla({
  tipo,
  personas,
  descripcionVacia,
  cargando = false,
  error = null,
  onReintentar,
  onEditar,
  onEliminar,
}: PersonasTablaProps) {
  return (
    <DataTable
      columnas={columnas(tipo, onEditar, onEliminar)}
      filas={personas}
      obtenerClave={(persona) => persona.id}
      cargando={cargando}
      error={error}
      onReintentar={onReintentar}
      vacio={
        <EmptyState
          icono={Users}
          titulo={`No hay ${tipo}s disponibles`}
          descripcion={descripcionVacia}
        />
      }
    />
  );
}
