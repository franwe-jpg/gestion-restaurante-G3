import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { FilterBar } from '../../../shared/components/ui/filter-bar';
import { FormField } from '../../../shared/components/ui/form-field';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';
import type { EstadoComanda, FiltroComandas } from '../types';

function CamposDeFiltro({
  mesa,
  onMesa,
  estado,
  onEstado,
  ocupado,
  onSubmit,
}: {
  mesa: string;
  onMesa: (valor: string) => void;
  estado: EstadoComanda | '';
  onEstado: (valor: EstadoComanda | '') => void;
  ocupado: boolean;
  onSubmit: (evento: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-4">
      <FormField id="filtro-mesa" label="Filtrar por mesa (ID)">
        <Input
          id="filtro-mesa"
          type="number"
          min="1"
          step="1"
          value={mesa}
          onChange={(e) => onMesa(e.target.value)}
        />
      </FormField>
      <FormField id="filtro-estado" label="Estado">
        <Select
          id="filtro-estado"
          value={estado}
          onChange={(e) => onEstado(e.target.value as EstadoComanda | '')}
        >
          <option value="">Todos</option>
          <option value="ABIERTA">Abierta</option>
          <option value="CERRADA">Cerrada</option>
          <option value="ANULADA">Anulada</option>
        </Select>
      </FormField>
      <Button variant="brand-outline" type="submit" disabled={ocupado}>
        Filtrar
      </Button>
    </form>
  );
}

export function FiltrosComandas({
  onFiltrar,
  ocupado,
}: {
  onFiltrar: (filtro: FiltroComandas) => void;
  ocupado: boolean;
}) {
  const [mesa, setMesa] = useState('');
  const [estado, setEstado] = useState<EstadoComanda | ''>('');
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    onFiltrar({
      mesa_id: mesa ? Number(mesa) : undefined,
      estado: estado || undefined,
      limit: 50,
      offset: 0,
    });
  }
  return (
    <TableToolbar>
      <FilterBar className="border-0 p-0">
        <CamposDeFiltro
          mesa={mesa}
          onMesa={setMesa}
          estado={estado}
          onEstado={setEstado}
          ocupado={ocupado}
          onSubmit={enviar}
        />
      </FilterBar>
    </TableToolbar>
  );
}
