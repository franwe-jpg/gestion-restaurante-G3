import type { ReactNode } from 'react';

import { Button } from '../../../shared/components/ui/button';
import { FilterBar } from '../../../shared/components/ui/filter-bar';
import { FormField } from '../../../shared/components/ui/form-field';
import { Select } from '../../../shared/components/ui/select';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';
import type { FiltroEstado } from '../types';

interface BarraMenusEjecutivosProps {
  estado: FiltroEstado;
  onCambiarEstado: (estado: FiltroEstado) => void;
  /** Sin `onNuevo` (rol sin permiso de gestion) no se muestra el boton de alta. */
  onNuevo?: () => void;
  /** Acciones adicionales de la barra, como la exportación del listado. */
  acciones?: ReactNode;
}

export function BarraMenusEjecutivos({
  estado,
  onCambiarEstado,
  onNuevo,
  acciones,
}: BarraMenusEjecutivosProps) {
  return (
    <TableToolbar
      acciones={
        <>
          {acciones}
          {onNuevo && (
            <Button variant="brand-outline" onClick={onNuevo}>
              Nuevo menú ejecutivo
            </Button>
          )}
        </>
      }
    >
      <FilterBar className="border-0 p-0">
        <FormField id="filtro-estado" label="Estado">
          <Select
            id="filtro-estado"
            value={estado}
            onChange={(evento) => onCambiarEstado(evento.currentTarget.value as FiltroEstado)}
          >
            <option value="HABILITADO">Habilitados</option>
            <option value="DESHABILITADO">Deshabilitados</option>
            <option value="TODOS">Todos</option>
          </Select>
        </FormField>
      </FilterBar>
    </TableToolbar>
  );
}
