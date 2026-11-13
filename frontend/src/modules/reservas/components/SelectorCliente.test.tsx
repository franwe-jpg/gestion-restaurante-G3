import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Pagina, RespuestaApi } from '../../../shared/types';
import { buscarClientes, listarClientes } from '../api';
import type { ClienteEncontrado } from '../types';

import { SelectorCliente } from './SelectorCliente';
import type { ErroresCliente } from './SelectorCliente';
import type { SeleccionCliente } from './validarReserva';

vi.mock('../api');

const ANA: ClienteEncontrado = { id: 7, nombre: 'Ana Pérez', telefono: '+54 280 1234567' };
const BETO: ClienteEncontrado = { id: 9, nombre: 'Beto Díaz', telefono: '280-999' };
const ZOE: ClienteEncontrado = { id: 3, nombre: 'Zoe Ruiz', telefono: '280-333' };
const TEXTO_ANA = 'Ana Pérez · +54 280 1234567';

function conClientes(items: ClienteEncontrado[]): RespuestaApi<Pagina<ClienteEncontrado>> {
  return { datos: { items, total: items.length, limit: 10, offset: 0 }, exito: true };
}

/** Lo que devuelve `GET /clientes?limit=100&offset=0`; `total` puede superar lo recibido. */
function conLista(
  items: ClienteEncontrado[],
  total = items.length,
): RespuestaApi<Pagina<ClienteEncontrado>> {
  return { datos: { items, total, limit: 100, offset: 0 }, exito: true };
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

beforeEach(() => {
  // Sin clientes registrados por defecto: las pruebas del buscador no ven opciones repetidas.
  vi.mocked(listarClientes).mockResolvedValue(conLista([]));
});

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

describe('SelectorCliente: datos del cliente nuevo', () => {
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

  it('encapsula los campos nuevos en una tarjeta compartida y cancelar descarta solo el borrador', () => {
    abrir({ tipo: 'nuevo', nombre: 'Luis', telefono: '123' });

    expect(screen.getByText('Datos del cliente nuevo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCambiar).toHaveBeenLastCalledWith({ tipo: 'ninguno' });
    expect(screen.queryByLabelText(/Nombre/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Cliente nuevo' })).toBeVisible();
  });
});

// Supuesto S66 (corrección 2026-11-11, revisada el 2026-11-13, pendiente de validación del equipo)
describe('SelectorCliente: campo Teléfono', () => {
  it('el campo Teléfono es de tipo tel, abre el teclado numérico y admite hasta 20 caracteres', () => {
    abrir({ tipo: 'nuevo', nombre: '', telefono: '' });

    const telefono = screen.getByLabelText(/Teléfono/);

    expect(telefono).toHaveAttribute('type', 'tel');
    expect(telefono).toHaveAttribute('inputmode', 'tel');
    expect(telefono).toHaveAttribute('maxlength', '20');
  });

  it.each([
    ['2804abc123', '2804123'],
    ['(280) 123.456', '280123456'],
    ['+54 280-123', '+54280-123'],
    ['+54 280 123-4567', '+54280123-4567'],
    ['abc280+456', '280456'],
    ['54+280', '54280'],
    ['   ', ''],
    ['abc', ''],
  ])('escribir «%s» en Teléfono deja solo «%s» (sin espacios)', (escrito, esperado) => {
    abrir({ tipo: 'nuevo', nombre: 'Luis', telefono: '' });

    fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: escrito } });

    expect(screen.getByLabelText(/Teléfono/)).toHaveValue(esperado);
    expect(onCambiar).toHaveBeenLastCalledWith({
      tipo: 'nuevo',
      nombre: 'Luis',
      telefono: esperado,
    });
  });
});

// Supuesto S70 (corrección 2026-11-13, pendiente de validación del equipo)
describe('SelectorCliente: campo Nombre', () => {
  it('el campo Nombre admite hasta 60 caracteres', () => {
    abrir({ tipo: 'nuevo', nombre: '', telefono: '' });

    expect(screen.getByLabelText(/Nombre/)).toHaveAttribute('maxlength', '60');
  });

  it.each([
    ['Luis3', 'Luis'],
    ['Ana!@# Pérez', 'Ana Pérez'],
    ['12345', ''],
    ['María José Núñez', 'María José Núñez'],
    ['  Ana  Luis ', '  Ana  Luis '],
  ])('escribir o pegar «%s» en Nombre deja solo «%s»', (escrito, esperado) => {
    abrir({ tipo: 'nuevo', nombre: '', telefono: '280-4556677' });

    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: escrito } });

    expect(screen.getByLabelText(/Nombre/)).toHaveValue(esperado);
    expect(onCambiar).toHaveBeenLastCalledWith({
      tipo: 'nuevo',
      nombre: esperado,
      telefono: '280-4556677',
    });
  });

  it('muestra el error de largo del Nombre bajo el campo', () => {
    abrir(
      { tipo: 'nuevo', nombre: '', telefono: '' },
      { nombre: 'El nombre admite hasta 60 caracteres' },
    );

    expect(screen.getByText('El nombre admite hasta 60 caracteres')).toBeVisible();
  });
});

describe('SelectorCliente: cambiar selección', () => {
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

function desplegable() {
  return screen.getByLabelText('Clientes registrados');
}

/** Texto y valor de cada opción del desplegable, en el orden en que se ofrecen. */
function opcionesDelDesplegable() {
  return within(desplegable())
    .getAllByRole<HTMLOptionElement>('option')
    .map((opcion) => [opcion.textContent, opcion.value]);
}

/** Espera a que la lista simulada llegue: el desplegable ya está habilitado. */
async function esperarLista() {
  await waitFor(() => expect(desplegable()).toBeEnabled());
}

// Supuesto S71 (corrección 2026-11-13, pendiente de validación del equipo)
describe('SelectorCliente: desplegable «Clientes registrados»', () => {
  it('pide GET /clientes una vez y ofrece los clientes ordenados por nombre', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conLista([ZOE, ANA, BETO]));
    abrir();

    await esperarLista();

    expect(listarClientes).toHaveBeenCalledTimes(1);
    expect(opcionesDelDesplegable()).toEqual([
      ['Elegir de la lista', ''],
      [TEXTO_ANA, '7'],
      ['Beto Díaz · 280-999', '9'],
      ['Zoe Ruiz · 280-333', '3'],
    ]);
  });

  it('va justo debajo del buscador, sin resultados de búsqueda en pantalla', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conLista([ANA]));
    abrir();
    await esperarLista();

    const buscador = screen.getByLabelText('Buscar cliente');

    expect(
      buscador.compareDocumentPosition(desplegable()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('mientras carga queda deshabilitado, con la opción inicial', () => {
    vi.mocked(listarClientes).mockReturnValue(new Promise(() => undefined));
    abrir();

    expect(desplegable()).toBeDisabled();
    expect(opcionesDelDesplegable()).toEqual([['Elegir de la lista', '']]);
  });
});

// Supuesto S71 (corrección 2026-11-13, pendiente de validación del equipo)
describe('SelectorCliente: elegir del desplegable «Clientes registrados»', () => {
  it('elegir un cliente equivale a elegirlo en el buscador', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conLista([ANA, BETO]));
    abrir();
    await esperarLista();

    fireEvent.change(desplegable(), { target: { value: '7' } });

    expect(onCambiar).toHaveBeenCalledExactlyOnceWith({ tipo: 'existente', cliente: ANA });
    expect(desplegable()).toHaveValue('7');
    expect(screen.getByText(`Cliente elegido: ${TEXTO_ANA}`)).toBeVisible();
    expect(screen.getByLabelText('Buscar cliente')).toHaveValue('');
  });

  it('elegir en el desplegable vacía el texto que había en el buscador', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conLista([ANA]));
    vi.mocked(buscarClientes).mockResolvedValue(conClientes([BETO]));
    abrir();
    await esperarLista();
    buscar('Beto');

    fireEvent.change(desplegable(), { target: { value: '7' } });

    expect(screen.getByLabelText('Buscar cliente')).toHaveValue('');
  });

  it('elegir en el buscador lo refleja en el desplegable', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conLista([ANA, BETO]));
    vi.mocked(buscarClientes).mockResolvedValue(conClientes([BETO]));
    abrir();
    await esperarLista();
    buscar('Beto');

    fireEvent.click(await screen.findByRole('button', { name: 'Beto Díaz · 280-999' }));

    expect(desplegable()).toHaveValue('9');
    expect(onCambiar).toHaveBeenLastCalledWith({ tipo: 'existente', cliente: BETO });
  });
});

// Supuesto S71 (corrección 2026-11-13, pendiente de validación del equipo)
describe('SelectorCliente: el desplegable vuelve a la opción inicial', () => {
  it('un cliente elegido que no está en la lista deja el desplegable en la opción inicial', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conLista([BETO]));
    abrir({ tipo: 'existente', cliente: ANA });
    await esperarLista();

    expect(desplegable()).toHaveValue('');
    expect(screen.getByText(`Cliente elegido: ${TEXTO_ANA}`)).toBeVisible();
  });

  it('volver a la opción inicial descarta al cliente elegido', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conLista([ANA]));
    abrir({ tipo: 'existente', cliente: ANA });
    await esperarLista();

    fireEvent.change(desplegable(), { target: { value: '' } });

    expect(onCambiar).toHaveBeenLastCalledWith({ tipo: 'ninguno' });
    expect(screen.queryByText(/Cliente elegido/)).toBeNull();
    expect(desplegable()).toHaveValue('');
  });

  it('la opción inicial sin cliente elegido no cambia nada', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conLista([ANA]));
    abrir();
    await esperarLista();

    fireEvent.change(desplegable(), { target: { value: '' } });

    expect(onCambiar).not.toHaveBeenCalled();
  });
});

// Supuesto S71 (corrección 2026-11-13, pendiente de validación del equipo)
describe('SelectorCliente: desplegable y «Cliente nuevo»', () => {
  it('«Cliente nuevo» oculta el desplegable y al cancelar vuelve en la opción inicial sin pedir la lista', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conLista([ANA]));
    abrir({ tipo: 'existente', cliente: ANA });
    await esperarLista();
    expect(desplegable()).toHaveValue('7');

    fireEvent.click(screen.getByRole('button', { name: 'Cliente nuevo' }));
    expect(screen.queryByLabelText('Clientes registrados')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(desplegable()).toHaveValue('');
    expect(desplegable()).toBeEnabled();
    expect(listarClientes).toHaveBeenCalledTimes(1);
  });

  it('con «Cliente nuevo» abierto desde el inicio no muestra el desplegable ni pide la lista', () => {
    abrir({ tipo: 'nuevo', nombre: '', telefono: '' });

    expect(screen.queryByLabelText('Clientes registrados')).toBeNull();
    expect(listarClientes).not.toHaveBeenCalled();
  });

  it('elegir en el buscador con «Cliente nuevo» abierto vuelve a mostrar el desplegable con el cliente', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conLista([ANA]));
    vi.mocked(buscarClientes).mockResolvedValue(conClientes([ANA]));
    abrir({ tipo: 'nuevo', nombre: 'Luis', telefono: '123' });
    buscar('Ana');

    fireEvent.click(await screen.findByRole('button', { name: TEXTO_ANA }));
    await esperarLista();

    expect(desplegable()).toHaveValue('7');
    expect(screen.queryByLabelText(/Nombre/)).toBeNull();
  });
});

// Supuesto S71 (corrección 2026-11-13, pendiente de validación del equipo)
describe('SelectorCliente: avisos del desplegable', () => {
  it('sin clientes registrados avisa y deja el desplegable deshabilitado', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conLista([]));
    abrir();

    expect(await screen.findByText('No hay clientes registrados.')).toBeVisible();
    expect(desplegable()).toBeDisabled();
    expect(opcionesDelDesplegable()).toEqual([['Elegir de la lista', '']]);
  });

  it('con más clientes que los recibidos avisa y remite al buscador', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conLista([ANA, BETO], 130));
    abrir();

    expect(
      await screen.findByText(
        'Se muestran los primeros 2 de 130 clientes. Los demás se encuentran con el buscador.',
      ),
    ).toBeVisible();
    expect(desplegable()).toBeEnabled();
  });

  it('con todos los clientes no muestra ningún aviso', async () => {
    vi.mocked(listarClientes).mockResolvedValue(conLista([ANA, BETO]));
    abrir();
    await esperarLista();

    expect(screen.queryByText(/Se muestran los primeros/)).toBeNull();
    expect(screen.queryByText('No hay clientes registrados.')).toBeNull();
  });

  it('si la lista falla avisa, no ofrece clientes y el buscador sigue funcionando', async () => {
    vi.mocked(listarClientes).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'Sin permiso',
    });
    vi.mocked(buscarClientes).mockResolvedValue(conClientes([ANA]));
    abrir();

    const aviso = await screen.findByText(
      'No se pudo cargar la lista de clientes. Se puede buscar por nombre o teléfono.',
    );
    expect(aviso).toBeVisible();
    expect(desplegable()).toBeDisabled();
    expect(opcionesDelDesplegable()).toEqual([['Elegir de la lista', '']]);
    buscar('Ana');
    expect(await screen.findByRole('button', { name: TEXTO_ANA })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cliente nuevo' })).toBeVisible();
  });
});
