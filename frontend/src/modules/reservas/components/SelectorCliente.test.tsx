import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Pagina, RespuestaApi } from '../../../shared/types';
import { buscarClientes } from '../api';
import type { ClienteEncontrado } from '../types';

import { SelectorCliente } from './SelectorCliente';
import type { ErroresCliente } from './SelectorCliente';
import type { SeleccionCliente } from './validarReserva';

vi.mock('../api');

const ANA: ClienteEncontrado = { id: 7, nombre: 'Ana Pérez', telefono: '+54 280 1234567' };

function conClientes(items: ClienteEncontrado[]): RespuestaApi<Pagina<ClienteEncontrado>> {
  return { datos: { items, total: items.length, limit: 10, offset: 0 }, exito: true };
}

const onCambiar = vi.fn<(seleccion: SeleccionCliente) => void>();
const onEnviar = vi.fn();

/** Guarda la elección como lo hace el formulario: el selector es controlado. */
function Arnes({ inicial, errores }: { inicial: SeleccionCliente; errores?: ErroresCliente }) {
  const [seleccion, setSeleccion] = useState(inicial);
  return (
    <form onSubmit={onEnviar}>
      <SelectorCliente
        seleccion={seleccion}
        errores={errores ?? {}}
        onCambiar={(nueva) => {
          onCambiar(nueva);
          setSeleccion(nueva);
        }}
      />
    </form>
  );
}

function abrir(inicial: SeleccionCliente = { tipo: 'ninguno' }, errores?: ErroresCliente) {
  render(<Arnes inicial={inicial} errores={errores} />);
}

function buscar(texto: string) {
  fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: texto } });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('SelectorCliente: búsqueda', () => {
  it.each(['Ana', '1234567'])('buscar «%s» muestra «Ana Pérez · +54 280 1234567»', async (q) => {
    vi.mocked(buscarClientes).mockResolvedValue(conClientes([ANA]));
    abrir();

    buscar(q);

    expect(await screen.findByText('Ana Pérez · +54 280 1234567')).toBeVisible();
    expect(buscarClientes).toHaveBeenCalledWith(q);
  });

  it('mientras busca muestra «Buscando clientes…»', () => {
    vi.mocked(buscarClientes).mockReturnValue(new Promise(() => undefined));
    abrir();

    buscar('Ana');

    expect(screen.getByText('Buscando clientes…')).toBeVisible();
  });

  it('sin texto no muestra resultados ni pide la lista', () => {
    abrir();

    expect(screen.queryByText('Buscando clientes…')).toBeNull();
    expect(screen.queryByText('No se encontraron clientes')).toBeNull();
    expect(buscarClientes).not.toHaveBeenCalled();
  });

  it('sin resultados muestra «No se encontraron clientes» y deja «Cliente nuevo»', async () => {
    vi.mocked(buscarClientes).mockResolvedValue(conClientes([]));
    abrir();

    buscar('Zzz');

    expect(await screen.findByText('No se encontraron clientes')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cliente nuevo' })).toBeVisible();
  });

  it('si la búsqueda falla muestra el mensaje de la API junto al campo y ningún cliente', async () => {
    vi.mocked(buscarClientes).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'Sin conexión',
    });
    abrir();

    buscar('Ana');

    expect(await screen.findByText('Sin conexión')).toBeVisible();
    expect(screen.queryByText('No se encontraron clientes')).toBeNull();
  });

  it('Enter en la caja de búsqueda no envía el formulario', () => {
    abrir();

    const enter = fireEvent.keyDown(screen.getByLabelText('Buscar cliente'), { key: 'Enter' });

    expect(enter).toBe(false);
  });
});

describe('SelectorCliente: elegir', () => {
  it('elegir un cliente avisa, vacía la búsqueda y lo muestra como elegido', async () => {
    vi.mocked(buscarClientes).mockResolvedValue(conClientes([ANA]));
    abrir();
    buscar('Ana');

    fireEvent.click(await screen.findByRole('button', { name: 'Ana Pérez · +54 280 1234567' }));

    expect(onCambiar).toHaveBeenCalledWith({ tipo: 'existente', cliente: ANA });
    expect(screen.getByLabelText('Buscar cliente')).toHaveValue('');
    expect(screen.getByText('Cliente elegido: Ana Pérez · +54 280 1234567')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Ana Pérez · +54 280 1234567' })).toBeNull();
  });

  it('muestra el error de Cliente junto al campo', () => {
    abrir({ tipo: 'ninguno' }, { cliente: 'El cliente es obligatorio.' });

    expect(screen.getByText('El cliente es obligatorio.')).toBeVisible();
  });
});

describe('SelectorCliente: cliente nuevo', () => {
  it('«Cliente nuevo» muestra Nombre y Teléfono vacíos', () => {
    abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Cliente nuevo' }));

    expect(onCambiar).toHaveBeenCalledWith({ tipo: 'nuevo', nombre: '', telefono: '' });
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('');
    expect(screen.getByLabelText(/Teléfono/)).toHaveValue('');
    expect(screen.getByLabelText(/Nombre/)).toHaveAttribute('id', 'reserva-cliente-nombre');
    expect(screen.getByLabelText(/Teléfono/)).toHaveAttribute('id', 'reserva-cliente-telefono');
  });

  it('escribir Nombre y Teléfono actualiza la elección', () => {
    abrir({ tipo: 'nuevo', nombre: '', telefono: '' });

    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Luis' } });
    fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: '123' } });

    expect(onCambiar).toHaveBeenLastCalledWith({ tipo: 'nuevo', nombre: 'Luis', telefono: '123' });
  });

  it('muestra los errores de Nombre y Teléfono bajo cada campo', () => {
    abrir(
      { tipo: 'nuevo', nombre: '', telefono: '' },
      { nombre: 'El nombre es obligatorio', telefono: 'El teléfono es obligatorio' },
    );

    expect(screen.getByText('El nombre es obligatorio')).toBeVisible();
    expect(screen.getByText('El teléfono es obligatorio')).toBeVisible();
  });

  it('pasar de un cliente elegido a «Cliente nuevo» descarta al elegido', () => {
    abrir({ tipo: 'existente', cliente: ANA });

    fireEvent.click(screen.getByRole('button', { name: 'Cliente nuevo' }));

    expect(screen.queryByText(/Cliente elegido/)).toBeNull();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('');
  });

  it('pasar de «Cliente nuevo» a uno elegido descarta Nombre y Teléfono', async () => {
    vi.mocked(buscarClientes).mockResolvedValue(conClientes([ANA]));
    abrir({ tipo: 'nuevo', nombre: 'Luis', telefono: '123' });
    buscar('Ana');

    fireEvent.click(await screen.findByRole('button', { name: 'Ana Pérez · +54 280 1234567' }));

    expect(screen.queryByLabelText(/Nombre/)).toBeNull();
    expect(screen.getByText('Cliente elegido: Ana Pérez · +54 280 1234567')).toBeVisible();
  });

  it('ya en «Cliente nuevo», pulsarlo de nuevo no borra lo escrito', () => {
    abrir({ tipo: 'nuevo', nombre: 'Luis', telefono: '123' });

    fireEvent.click(screen.getByRole('button', { name: 'Cliente nuevo' }));

    expect(onCambiar).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Luis');
    expect(screen.getByLabelText(/Teléfono/)).toHaveValue('123');
  });
});
