import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { FormField } from '../../../shared/components/ui/form-field';
import type { EstadoComanda, FiltroComandas } from '../types';

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
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-4">
      <FormField id="filtro-mesa" label="Filtrar por mesa (ID)">
        <Input
          id="filtro-mesa"
          type="number"
          min="1"
          step="1"
          value={mesa}
          onChange={(e) => setMesa(e.target.value)}
        />
      </FormField>
      <FormField id="filtro-estado" label="Estado">
        <Select
          id="filtro-estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoComanda | '')}
        >
          <option value="">Todos</option>
          <option value="ABIERTA">ABIERTA</option>
          <option value="CERRADA">CERRADA</option>
          <option value="ANULADA">ANULADA</option>
        </Select>
      </FormField>
      <Button type="submit" disabled={ocupado}>
        Filtrar
      </Button>
    </form>
  );
}
