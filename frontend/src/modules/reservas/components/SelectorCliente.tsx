import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import { Button } from '../../../shared/components/ui/button';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { List, ListItem } from '../../../shared/components/ui/list';
import { SearchInput } from '../../../shared/components/ui/search-input';
import type { ClienteEncontrado } from '../types';

import { useBuscarClientes } from './useBuscarClientes';
import type { EstadoBusquedaClientes } from './useBuscarClientes';
import type { SeleccionCliente } from './validarReserva';

/** Errores de la validación local de los tres campos que el selector muestra. */
export interface ErroresCliente {
  cliente?: string;
  nombre?: string;
  telefono?: string;
}

export interface SelectorClienteProps {
  seleccion: SeleccionCliente;
  errores: ErroresCliente;
  onCambiar: (seleccion: SeleccionCliente) => void;
}

const ID_CLIENTE = 'reserva-cliente';
const SELECCION_NUEVO: SeleccionCliente = { tipo: 'nuevo', nombre: '', telefono: '' };

function textoDeCliente({ nombre, telefono }: ClienteEncontrado): string {
  return `${nombre} · ${telefono}`;
}

/** Sin texto no hay resultados; `buscando` y la lista vacía tienen su propio aviso. */
function ResultadosDeClientes({
  estado,
  onElegir,
}: {
  estado: EstadoBusquedaClientes;
  onElegir: (cliente: ClienteEncontrado) => void;
}) {
  if (estado.tipo === 'buscando')
    return <p className="text-sm text-slate-500">Buscando clientes…</p>;
  if (estado.tipo !== 'listo') return null;
  if (estado.clientes.length === 0) {
    return <p className="text-sm text-slate-500">No se encontraron clientes</p>;
  }
  return (
    <List>
      {estado.clientes.map((cliente) => (
        <ListItem key={cliente.id}>
          <Button type="button" variant="ghost" onClick={() => onElegir(cliente)}>
            {textoDeCliente(cliente)}
          </Button>
        </ListItem>
      ))}
    </List>
  );
}

interface CamposClienteNuevoProps {
  nombre: string;
  telefono: string;
  errores: ErroresCliente;
  onCambiar: (seleccion: SeleccionCliente) => void;
}

function CamposClienteNuevo({ nombre, telefono, errores, onCambiar }: CamposClienteNuevoProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField id="reserva-cliente-nombre" label="Nombre" required error={errores.nombre}>
        <Input
          id="reserva-cliente-nombre"
          value={nombre}
          onChange={(evento) => onCambiar({ tipo: 'nuevo', nombre: evento.target.value, telefono })}
        />
      </FormField>
      <FormField id="reserva-cliente-telefono" label="Teléfono" required error={errores.telefono}>
        <Input
          id="reserva-cliente-telefono"
          value={telefono}
          onChange={(evento) => onCambiar({ tipo: 'nuevo', nombre, telefono: evento.target.value })}
        />
      </FormField>
    </div>
  );
}

/** Enter en la caja no envía la reserva: la búsqueda se hace sola al escribir. */
function ignorarEnter(evento: KeyboardEvent<HTMLInputElement>) {
  if (evento.key === 'Enter') evento.preventDefault();
}

/**
 * Campo Cliente del alta (Decisión 30): se busca un cliente registrado por nombre o teléfono, o se
 * pulsa «Cliente nuevo» para cargar Nombre y Teléfono. Las dos vías son excluyentes. El selector
 * es controlado: la elección vive en el formulario.
 */
export function SelectorCliente({ seleccion, errores, onCambiar }: SelectorClienteProps) {
  const [texto, setTexto] = useState('');
  const estado = useBuscarClientes(texto);
  const errorDelCampo = errores.cliente ?? (estado.tipo === 'error' ? estado.mensaje : undefined);

  const elegir = (cliente: ClienteEncontrado) => {
    setTexto('');
    onCambiar({ tipo: 'existente', cliente });
  };

  return (
    <div className="space-y-3">
      <FormField id={ID_CLIENTE} label="Cliente" required error={errorDelCampo}>
        <SearchInput
          id={ID_CLIENTE}
          aria-label="Buscar cliente"
          placeholder="Nombre o teléfono"
          className="sm:max-w-none"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={ignorarEnter}
          onLimpiar={() => setTexto('')}
        />
      </FormField>
      <ResultadosDeClientes estado={estado} onElegir={elegir} />
      {seleccion.tipo === 'existente' && (
        <p className="text-sm font-medium text-slate-900">
          Cliente elegido: {textoDeCliente(seleccion.cliente)}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={() => seleccion.tipo !== 'nuevo' && onCambiar(SELECCION_NUEVO)}
      >
        Cliente nuevo
      </Button>
      {seleccion.tipo === 'nuevo' && (
        <CamposClienteNuevo
          nombre={seleccion.nombre}
          telefono={seleccion.telefono}
          errores={errores}
          onCambiar={onCambiar}
        />
      )}
    </div>
  );
}
