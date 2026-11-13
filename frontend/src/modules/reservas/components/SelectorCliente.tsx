import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import { Button } from '../../../shared/components/ui/button';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { List, ListItem } from '../../../shared/components/ui/list';
import { SearchInput } from '../../../shared/components/ui/search-input';
import { Select } from '../../../shared/components/ui/select';
import type { ClienteEncontrado } from '../types';

import { useBuscarClientes } from './useBuscarClientes';
import type { EstadoBusquedaClientes } from './useBuscarClientes';
import { useClientesRegistrados } from './useClientesRegistrados';
import type { ClientesRegistrados } from './useClientesRegistrados';
import {
  NOMBRE_LARGO_MAXIMO,
  TELEFONO_LARGO_MAXIMO,
  filtrarNombre,
  filtrarTelefono,
} from './validarReserva';
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
const ID_CLIENTES_REGISTRADOS = 'reserva-clientes-registrados';
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

const TEXTO_SIN_ELEGIR = 'Elegir de la lista';
const TEXTO_SIN_CLIENTES = 'No hay clientes registrados.';
const TEXTO_ERROR_DE_LISTA =
  'No se pudo cargar la lista de clientes. Se puede buscar por nombre o teléfono.';

/** Aviso del desplegable: el error de la carga, que no deja elegir, o una pista sobre la lista. */
function avisoDeLaLista({ clientes, total, cargando, error }: ClientesRegistrados) {
  if (error !== undefined) return { error: TEXTO_ERROR_DE_LISTA };
  if (cargando) return {};
  if (clientes.length === 0) return { hint: TEXTO_SIN_CLIENTES };
  if (total <= clientes.length) return {};
  return {
    hint: `Se muestran los primeros ${clientes.length} de ${total} clientes. Los demás se encuentran con el buscador.`,
  };
}

interface ClientesRegistradosCampoProps {
  estado: ClientesRegistrados;
  seleccion: SeleccionCliente;
  onElegir: (cliente: ClienteEncontrado) => void;
  onLimpiar: () => void;
}

/**
 * Desplegable «Clientes registrados» (S71): elegir uno equivale a elegirlo en el buscador. Refleja
 * al cliente elegido si figura en la lista y vuelve a la opción inicial si la elección se limpia,
 * se abre «Cliente nuevo» o el elegido no está entre los primeros de la lista. Sin clientes
 * (cargando, con error o lista vacía) queda deshabilitado.
 */
function ClientesRegistradosCampo({
  estado,
  seleccion,
  onElegir,
  onLimpiar,
}: ClientesRegistradosCampoProps) {
  const { hint, error } = avisoDeLaLista(estado);
  const elegido = seleccion.tipo === 'existente' ? seleccion.cliente.id : undefined;
  const valor = estado.clientes.some(({ id }) => id === elegido) ? String(elegido) : '';
  const descripcion = error
    ? `${ID_CLIENTES_REGISTRADOS}-error`
    : `${ID_CLIENTES_REGISTRADOS}-descripcion`;

  const alCambiar = (texto: string) => {
    const cliente = estado.clientes.find(({ id }) => String(id) === texto);
    if (cliente) onElegir(cliente);
    else if (elegido !== undefined) onLimpiar();
  };

  return (
    <FormField id={ID_CLIENTES_REGISTRADOS} label="Clientes registrados" hint={hint} error={error}>
      <Select
        id={ID_CLIENTES_REGISTRADOS}
        value={valor}
        disabled={estado.clientes.length === 0}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? descripcion : undefined}
        onChange={(evento) => alCambiar(evento.target.value)}
      >
        <option value="">{TEXTO_SIN_ELEGIR}</option>
        {estado.clientes.map((cliente) => (
          <option key={cliente.id} value={String(cliente.id)}>
            {textoDeCliente(cliente)}
          </option>
        ))}
      </Select>
    </FormField>
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
    <Card role="group" aria-label="Datos del cliente nuevo">
      <CardHeader>
        <CardTitle>Datos del cliente nuevo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField id="reserva-cliente-nombre" label="Nombre" required error={errores.nombre}>
            <Input
              id="reserva-cliente-nombre"
              maxLength={NOMBRE_LARGO_MAXIMO}
              value={nombre}
              onChange={(evento) =>
                onCambiar({ tipo: 'nuevo', nombre: filtrarNombre(evento.target.value), telefono })
              }
            />
          </FormField>
          <FormField
            id="reserva-cliente-telefono"
            label="Teléfono"
            required
            error={errores.telefono}
          >
            <Input
              id="reserva-cliente-telefono"
              type="tel"
              inputMode="tel"
              maxLength={TELEFONO_LARGO_MAXIMO}
              value={telefono}
              onChange={(evento) =>
                onCambiar({ tipo: 'nuevo', nombre, telefono: filtrarTelefono(evento.target.value) })
              }
            />
          </FormField>
        </div>
        <Button
          type="button"
          variant="brand-outline"
          onClick={() => onCambiar({ tipo: 'ninguno' })}
        >
          Cancelar
        </Button>
      </CardContent>
    </Card>
  );
}

/** Enter en la caja no envía la reserva: la búsqueda se hace sola al escribir. */
function ignorarEnter(evento: KeyboardEvent<HTMLInputElement>) {
  if (evento.key === 'Enter') evento.preventDefault();
}

interface CajaDeBusquedaProps {
  texto: string;
  error?: string;
  onCambiarTexto: (texto: string) => void;
}

/** Caja de búsqueda del campo Cliente: la búsqueda se hace sola, sin botón. */
function CajaDeBusqueda({ texto, error, onCambiarTexto }: CajaDeBusquedaProps) {
  return (
    <FormField id={ID_CLIENTE} label="Cliente" required error={error}>
      <SearchInput
        id={ID_CLIENTE}
        aria-label="Buscar cliente"
        placeholder="Nombre o teléfono"
        className="sm:max-w-none"
        value={texto}
        onChange={(evento) => onCambiarTexto(evento.target.value)}
        onKeyDown={ignorarEnter}
        onLimpiar={() => onCambiarTexto('')}
      />
    </FormField>
  );
}

/**
 * Campo Cliente del alta (Decisión 30): se busca un cliente registrado por nombre o teléfono, se lo
 * elige del desplegable «Clientes registrados» (S71) o se pulsa «Cliente nuevo» para cargar Nombre y
 * Teléfono. Las dos primeras vías eligen al mismo cliente; contra «Cliente nuevo» son excluyentes.
 * El selector es controlado: la elección vive en el formulario. La lista del desplegable se pide una
 * sola vez, mientras no esté abierta la tarjeta del cliente nuevo.
 */
export function SelectorCliente({ seleccion, errores, onCambiar }: SelectorClienteProps) {
  const [texto, setTexto] = useState('');
  const estado = useBuscarClientes(texto);
  const registrados = useClientesRegistrados(seleccion.tipo !== 'nuevo');
  const errorDelCampo = errores.cliente ?? (estado.tipo === 'error' ? estado.mensaje : undefined);

  const elegir = (cliente: ClienteEncontrado) => {
    setTexto('');
    onCambiar({ tipo: 'existente', cliente });
  };

  return (
    <div className="space-y-3">
      <CajaDeBusqueda texto={texto} error={errorDelCampo} onCambiarTexto={setTexto} />
      <ResultadosDeClientes estado={estado} onElegir={elegir} />
      {seleccion.tipo !== 'nuevo' && (
        <ClientesRegistradosCampo
          estado={registrados}
          seleccion={seleccion}
          onElegir={elegir}
          onLimpiar={() => onCambiar({ tipo: 'ninguno' })}
        />
      )}
      {seleccion.tipo === 'existente' && (
        <p className="text-sm font-medium text-slate-900">
          Cliente elegido: {textoDeCliente(seleccion.cliente)}
        </p>
      )}
      <Button
        type="button"
        variant="brand-outline"
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
