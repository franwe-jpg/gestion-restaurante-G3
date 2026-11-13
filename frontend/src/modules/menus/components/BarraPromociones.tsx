import type { ReactNode } from 'react';

import { Button } from '../../../shared/components/ui/button';
import { FilterBar } from '../../../shared/components/ui/filter-bar';
import { FormField } from '../../../shared/components/ui/form-field';
import { Select } from '../../../shared/components/ui/select';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';
import type { FiltroEstado } from '../types';

interface BarraPromocionesProps {
  estado: FiltroEstado;
  onCambiarEstado: (estado: FiltroEstado) => void;
  /** Sin `onNueva` (rol sin permiso de gestion) no se muestra el boton de alta. */
  onNueva?: () => void;
  /** Acciones adicionales de la barra, como la exportación del listado. */
  acciones?: ReactNode;
}

export function BarraPromociones({
  estado,
  onCambiarEstado,
  onNueva,
  acciones,
}: BarraPromocionesProps) {
  return (
    <TableToolbar
      acciones={
        <>
          {acciones}
          {onNueva && (
            <Button variant="brand-outline" onClick={onNueva}>
              Nueva promoción
            </Button>
          )}
        </>
      }
    >
      <FilterBar className="border-0 p-0">
        <FormField id="filtro-estado-promocion" label="Estado">
          <Select
            id="filtro-estado-promocion"
            value={estado}
            onChange={(evento) => onCambiarEstado(evento.currentTarget.value as FiltroEstado)}
          >
            <option value="HABILITADO">Vigentes</option>
            <option value="DESHABILITADO">Finalizadas</option>
            <option value="TODOS">Todas</option>
          </Select>
        </FormField>
      </FilterBar>
    </TableToolbar>
  );
}
