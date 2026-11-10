import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import * as api from '../api';
import type { DetalleEntrega, EntregasComanda, EstadoComanda } from '../types';
import { EntregasComandaDialog } from './EntregasComandaDialog';

vi.mock('../api', () => ({
  consultarEntregas: vi.fn(),
  registrarEntrega: vi.fn(),
  listarProductos: vi.fn(),
  listarMenusEjecutivos: vi.fn(),
}));

const VACIA = { exito: true, datos: { items: [], total: 0, limit: 100, offset: 0 } };

function linea(id: number, cantidad: number, entregada: number, menu = false): DetalleEntrega {
  return {
    id,
    producto_id: menu ? null : 10 + id,
    menu_ejecutivo_id: menu ? 20 + id : null,
    cantidad,
    cantidad_entregada: entregada,
    estado_entrega: entregada === cantidad ? 'ENTREGADO' : 'PENDIENTE',
  };
}

function comanda(detalles: DetalleEntrega[], estado: EstadoComanda = 'ABIERTA'): EntregasComanda {
  return { comanda_id: 3, estado, detalles };
}

function cargar(datos: EntregasComanda) {
  vi.mocked(api.consultarEntregas).mockResolvedValue({ exito: true, datos });
}

function responder(datos: EntregasComanda) {
  vi.mocked(api.registrarEntrega).mockResolvedValue({ exito: true, datos });
}

async function abrir() {
  render(<EntregasComandaDialog id={3} onSalir={vi.fn()} />);
  return await screen.findByRole('dialog');
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.listarProductos).mockResolvedValue(VACIA);
  vi.mocked(api.listarMenusEjecutivos).mockResolvedValue(VACIA);
});

function conNombres() {
  vi.mocked(api.listarProductos).mockResolvedValue({
    exito: true,
    datos: {
      items: [
        { id: 11, nombre: 'Milanesa', precio: '9000.00', estado: 'HABILITADO' },
        { id: 12, nombre: 'Flan', precio: '3000.00', estado: 'DESHABILITADO' },
      ],
      total: 2,
      limit: 100,
      offset: 0,
    },
  });
  vi.mocked(api.listarMenusEjecutivos).mockResolvedValue({
    exito: true,
    datos: {
      items: [{ id: 22, nombre: 'Menú del día', precio_fijo: '12000.00', estado: 'HABILITADO' }],
      total: 1,
      limit: 100,
      offset: 0,
    },
  });
}

it('muestra la referencia, las unidades entregadas y la insignia de cada línea', async () => {
  cargar(comanda([linea(1, 10, 2), linea(2, 3, 3, true)]));
  const dialogo = await abrir();
  expect(api.consultarEntregas).toHaveBeenCalledWith(3);
  expect(within(dialogo).getByText('Producto #11')).toBeInTheDocument();
  expect(within(dialogo).getByText('2 de 10')).toBeInTheDocument();
  expect(within(dialogo).getByText('Pendiente')).toBeInTheDocument();
  expect(within(dialogo).getByText('Menú #22')).toBeInTheDocument();
  expect(within(dialogo).getByText('3 de 3')).toBeInTheDocument();
  expect(within(dialogo).getByText('Entregado')).toBeInTheDocument();
});

it('suma una unidad con + y muestra el valor devuelto por el servidor', async () => {
  cargar(comanda([linea(1, 10, 2)]));
  responder(comanda([linea(1, 10, 3)]));
  await abrir();
  fireEvent.click(screen.getByRole('button', { name: 'Sumar una unidad de Producto #11' }));
  expect(api.registrarEntrega).toHaveBeenCalledWith(3, 1, 3);
  expect(await screen.findByText('3 de 10')).toBeInTheDocument();
  expect(screen.queryByText('2 de 10')).not.toBeInTheDocument();
});

it('desmarca con − una línea entregada y la insignia pasa a Pendiente', async () => {
  cargar(comanda([linea(1, 3, 3)]));
  responder(comanda([linea(1, 3, 2)]));
  await abrir();
  expect(screen.getByText('Entregado')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Restar una unidad de Producto #11' }));
  expect(api.registrarEntrega).toHaveBeenCalledWith(3, 1, 2);
  expect(await screen.findByText('2 de 3')).toBeInTheDocument();
  expect(screen.getByText('Pendiente')).toBeInTheDocument();
  expect(screen.queryByText('Entregado')).not.toBeInTheDocument();
});

it('deshabilita − en cero y + en la cantidad pedida', async () => {
  cargar(comanda([linea(1, 5, 0), linea(2, 5, 5), linea(3, 5, 2)]));
  await abrir();
  const boton = (nombre: string) => screen.getByRole('button', { name: nombre });
  expect(boton('Restar una unidad de Producto #11')).toBeDisabled();
  expect(boton('Sumar una unidad de Producto #11')).toBeEnabled();
  expect(boton('Sumar una unidad de Producto #12')).toBeDisabled();
  expect(boton('Restar una unidad de Producto #12')).toBeEnabled();
  expect(boton('Restar una unidad de Producto #13')).toBeEnabled();
  expect(boton('Sumar una unidad de Producto #13')).toBeEnabled();
});

it('entrega todo de una línea con la cantidad pedida', async () => {
  cargar(comanda([linea(1, 10, 2)]));
  responder(comanda([linea(1, 10, 10)]));
  await abrir();
  fireEvent.click(screen.getByRole('button', { name: 'Entregar todo de Producto #11' }));
  expect(api.registrarEntrega).toHaveBeenCalledWith(3, 1, 10);
  expect(await screen.findByText('10 de 10')).toBeInTheDocument();
  expect(screen.getByText('Entregado')).toBeInTheDocument();
});

it('informa que no falta servir nada cuando todas las líneas están completas', async () => {
  cargar(comanda([linea(1, 2, 2), linea(2, 4, 4)]));
  await abrir();
  expect(screen.getByText('No falta servir nada')).toBeInTheDocument();
});

it('no informa que no falta servir nada si queda una línea pendiente', async () => {
  cargar(comanda([linea(1, 2, 2), linea(2, 4, 3)]));
  await abrir();
  expect(screen.getByText('3 de 4')).toBeInTheDocument();
  expect(screen.queryByText('No falta servir nada')).not.toBeInTheDocument();
});

it('bloquea todos los controles mientras hay una llamada en vuelo', async () => {
  cargar(comanda([linea(1, 10, 2), linea(2, 5, 1)]));
  let resolver: (r: { exito: true; datos: EntregasComanda }) => void = () => undefined;
  vi.mocked(api.registrarEntrega).mockReturnValue(new Promise((r) => (resolver = r)));
  await abrir();
  fireEvent.click(screen.getByRole('button', { name: 'Sumar una unidad de Producto #11' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Sumar una unidad de Producto #12' })).toBeDisabled(),
  );
  for (const boton of screen.getAllByRole('button', { name: /unidad|Entregar todo/ })) {
    expect(boton).toBeDisabled();
  }
  resolver({ exito: true, datos: comanda([linea(1, 10, 3), linea(2, 5, 1)]) });
  expect(await screen.findByText('3 de 10')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sumar una unidad de Producto #12' })).toBeEnabled();
});

it.each(['CERRADA', 'ANULADA'] as const)(
  'con la comanda %s muestra las líneas y deshabilita los controles',
  async (estado) => {
    cargar(comanda([linea(1, 5, 2)], estado));
    await abrir();
    expect(screen.getByText('2 de 5')).toBeInTheDocument();
    for (const nombre of [
      'Restar una unidad de Producto #11',
      'Sumar una unidad de Producto #11',
      'Entregar todo de Producto #11',
    ]) {
      expect(screen.getByRole('button', { name: nombre })).toBeDisabled();
    }
  },
);

it('ante un error al registrar muestra el mensaje y recarga las entregas', async () => {
  cargar(comanda([linea(1, 10, 2)]));
  vi.mocked(api.registrarEntrega).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'Solo se pueden registrar entregas de una comanda ABIERTA',
  });
  await abrir();
  cargarTrasConflicto();
  fireEvent.click(screen.getByRole('button', { name: 'Sumar una unidad de Producto #11' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('ABIERTA');
  await waitFor(() => expect(api.consultarEntregas).toHaveBeenCalledTimes(2));
  expect(await screen.findByText('2 de 10')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sumar una unidad de Producto #11' })).toBeDisabled();
});

it('muestra un mensaje si no se pueden cargar las entregas', async () => {
  vi.mocked(api.consultarEntregas).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'La comanda 3 no existe',
  });
  render(<EntregasComandaDialog id={3} onSalir={vi.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('La comanda 3 no existe');
  expect(screen.queryByRole('button', { name: /unidad/ })).not.toBeInTheDocument();
});

it('vuelve con el botón Volver', async () => {
  cargar(comanda([linea(1, 2, 2)]));
  const onSalir = vi.fn();
  render(<EntregasComandaDialog id={3} onSalir={onSalir} />);
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
  expect(onSalir).toHaveBeenCalledTimes(1);
});

function cargarTrasConflicto() {
  // La recarga posterior al error devuelve la comanda ya cerrada por otro mozo.
  vi.mocked(api.consultarEntregas).mockResolvedValue({
    exito: true,
    datos: comanda([linea(1, 10, 2)], 'CERRADA'),
  });
}

it('muestra el nombre del producto y del menú, incluso deshabilitado, en lugar del ID', async () => {
  conNombres();
  cargar(comanda([linea(1, 10, 2), linea(2, 3, 3, true)]));
  const dialogo = await abrir();
  expect(await within(dialogo).findByText('Milanesa')).toBeInTheDocument();
  expect(within(dialogo).getByText('Menú del día')).toBeInTheDocument();
  expect(within(dialogo).queryByText('Producto #11')).not.toBeInTheDocument();
  expect(
    within(dialogo).getByRole('button', { name: 'Sumar una unidad de Milanesa' }),
  ).toBeInTheDocument();
});

it('nombra el producto deshabilitado y conserva el respaldo para un ID desconocido', async () => {
  conNombres();
  cargar(comanda([linea(2, 3, 0), linea(5, 1, 0)]));
  const dialogo = await abrir();
  expect(await within(dialogo).findByText('Flan')).toBeInTheDocument();
  expect(within(dialogo).getByText('Producto #15')).toBeInTheDocument();
});

it('si falla la carga de nombres usa el respaldo y no bloquea la acción', async () => {
  vi.mocked(api.listarProductos).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'HTTP 500',
  });
  cargar(comanda([linea(1, 10, 2)]));
  responder(comanda([linea(1, 10, 3)]));
  await abrir();
  fireEvent.click(await screen.findByRole('button', { name: 'Sumar una unidad de Producto #11' }));
  expect(api.registrarEntrega).toHaveBeenCalledWith(3, 1, 3);
});
