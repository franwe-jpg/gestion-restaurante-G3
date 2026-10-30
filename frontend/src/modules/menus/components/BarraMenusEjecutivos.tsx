import { Plus } from 'lucide-react';

import { Button } from '../../../shared/components/ui/button';
import { FormField } from '../../../shared/components/ui/form-field';
import { Select } from '../../../shared/components/ui/select';
import type { FiltroEstado } from '../types';

interface BarraMenusEjecutivosProps {
  estado: FiltroEstado;
  onCambiarEstado: (estado: FiltroEstado) => void;
  onNuevo: () => void;
}

export function BarraMenusEjecutivos({
  estado,
  onCambiarEstado,
  onNuevo,
}: BarraMenusEjecutivosProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
      <Button onClick={onNuevo}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nuevo menú ejecutivo
      </Button>
    </div>
  );
}
