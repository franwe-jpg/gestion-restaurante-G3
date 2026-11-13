import { useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { Users } from 'lucide-react';

import { Button } from '../../../shared/components/ui/button';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ui/error-state';
import { FormField } from '../../../shared/components/ui/form-field';
import { SearchInput } from '../../../shared/components/ui/search-input';
import { Spinner } from '../../../shared/components/ui/spinner';
import type { MozoSeleccionable } from '../types';
import { etiquetaMozo } from './catalogoComanda';

export interface CampoMozoProps {
  mozoId: string;
  texto: string;
  mozos: MozoSeleccionable[];
  cargando: boolean;
  error: string | null;
  onTexto: (texto: string) => void;
  onSeleccionar: (mozo: MozoSeleccionable) => void;
  onReintentar: () => void;
}

export function CampoMozo(props: CampoMozoProps) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="space-y-3">
      <EntradaMozo {...props} abierto={abierto} setAbierto={setAbierto} />
      <EstadoBusquedaMozo {...props} />
    </div>
  );
}

function EntradaMozo({
  mozoId,
  texto,
  mozos,
  onTexto,
  onSeleccionar,
  abierto,
  setAbierto,
}: CampoMozoProps & { abierto: boolean; setAbierto: (abierto: boolean) => void }) {
  const mostrarOpciones = abierto && mozos.length > 0;
  return (
    <FormField id="comanda-mozo" label="Mozo" required>
      <div className="relative" onBlur={(event) => cerrarAlPerderFoco(event, setAbierto)}>
        <SearchInput
          id="comanda-mozo"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls="comanda-mozos-opciones"
          aria-expanded={mostrarOpciones}
          autoComplete="off"
          required
          placeholder="Buscar por nombre o apellido"
          value={texto}
          onFocus={() => setAbierto(true)}
          onChange={(event) => {
            onTexto(event.target.value);
            setAbierto(true);
          }}
          onKeyDown={(event) => manejarTeclaMozo(event, mozos, onSeleccionar, setAbierto)}
          onLimpiar={() => onTexto('')}
        />
        {mostrarOpciones && (
          <ListaMozos
            mozos={mozos}
            mozoId={mozoId}
            onSeleccionar={(mozo) => {
              onSeleccionar(mozo);
              setAbierto(false);
            }}
          />
        )}
      </div>
    </FormField>
  );
}

function cerrarAlPerderFoco(
  event: FocusEvent<HTMLDivElement>,
  setAbierto: (abierto: boolean) => void,
) {
  const destino = event.relatedTarget;
  if (!(destino instanceof Node) || !event.currentTarget.contains(destino)) setAbierto(false);
}

function EstadoBusquedaMozo({ cargando, error, mozos, texto, onReintentar }: CampoMozoProps) {
  if (cargando) return <Spinner etiqueta="Buscando mozos habilitados…" />;
  if (error) {
    return (
      <ErrorState
        titulo="No se pudieron cargar los mozos"
        descripcion={error}
        onReintentar={onReintentar}
      />
    );
  }
  if (mozos.length > 0) return null;
  return (
    <EmptyState
      icono={Users}
      titulo={texto.trim() ? 'Sin coincidencias' : 'No hay mozos habilitados'}
      descripcion={
        texto.trim()
          ? 'Probá con otro nombre o apellido.'
          : 'No se puede abrir una comanda sin seleccionar un mozo habilitado.'
      }
    />
  );
}

function ListaMozos({
  mozos,
  mozoId,
  onSeleccionar,
}: {
  mozos: MozoSeleccionable[];
  mozoId: string;
  onSeleccionar: (mozo: MozoSeleccionable) => void;
}) {
  return (
    <div
      id="comanda-mozos-opciones"
      role="listbox"
      className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"
    >
      {mozos.map((mozo) => (
        <Button
          key={mozo.id}
          type="button"
          role="option"
          aria-selected={mozoId === String(mozo.id)}
          variant="ghost"
          className="w-full justify-start"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSeleccionar(mozo)}
        >
          {etiquetaMozo(mozo)}
        </Button>
      ))}
    </div>
  );
}

function manejarTeclaMozo(
  event: KeyboardEvent<HTMLInputElement>,
  mozos: MozoSeleccionable[],
  onSeleccionar: (mozo: MozoSeleccionable) => void,
  setAbierto: (abierto: boolean) => void,
) {
  if (event.key === 'Escape') setAbierto(false);
  if (event.key === 'ArrowDown') setAbierto(true);
  if (event.key === 'Enter' && mozos[0]) {
    event.preventDefault();
    onSeleccionar(mozos[0]);
    setAbierto(false);
  }
}
