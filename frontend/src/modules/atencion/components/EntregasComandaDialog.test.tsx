import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import * as api from '../api';
import type { DetalleEntrega, EntregasComanda, EstadoComanda } from '../types';
import { EntregasComandaDialog } from './EntregasComandaDialog';

vi.mock('../api', () => ({
  consultarEntregas: vi.fn(),
  registrarEntrega: vi.fn(),
  marcarListo: vi.fn(),
  listarProductos: vi.fn(),
  listarMenusEjecutivos: vi.fn(),
}));

const VACIA = { exito: true, datos: { items: [], total: 0, limit: 100, offset: 0 } };

function linea(
  id: number,
  cantidad: number,
  entregada: number,
  menu = false,
  lista = 0,
): DetalleEntrega {
  return {
    id,
    producto_id: menu ? null : 10 + id,
    menu_ejecutivo_id: menu ? 20 + id : null,
    cantidad,
    cantidad_entregada: entregada,
    cantidad_lista: lista,
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

function responderListo(datos: EntregasComanda) {
  vi.mocked(api.marcarListo).mockResolvedValue({ exito: true, datos });
}

async function abrir(puedeEntregar = true, puedeMarcarListo = true) {
  render(
    <EntregasComandaDialog
      id={3}
      puedeEntregar={puedeEntregar}
      puedeMarcarListo={puedeMarcarListo}
      onSalir={vi.fn()}
    />,
  );
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
  render(<EntregasComandaDialog id={3} puedeEntregar puedeMarcarListo onSalir={vi.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('La comanda 3 no existe');
  expect(screen.queryByRole('button', { name: /unidad/ })).not.toBeInTheDocument();
});

it('vuelve con el botón Volver', async () => {
  cargar(comanda([linea(1, 2, 2)]));
  const onSalir = vi.fn();
  render(<EntregasComandaDialog id={3} puedeEntregar puedeMarcarListo onSalir={onSalir} />);
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

// Listo en cocina (HU-M4-12)

const boton = (nombre: string) => screen.getByRole('button', { name: nombre });

it('muestra los tres estados de una línea: 2 entregadas, 5 listas y 3 pendientes', async () => {
  cargar(comanda([linea(1, 10, 2, false, 7)]));
  const dialogo = await abrir();
  expect(within(dialogo).getByText('2 de 10')).toBeInTheDocument();
  expect(within(dialogo).getByText('Listas para servir: 5')).toBeInTheDocument();
  expect(within(dialogo).getByText('Entregado')).toBeInTheDocument();
  expect(within(dialogo).getByText('Listo para servir')).toBeInTheDocument();
  expect(within(dialogo).getByText('Pendiente')).toBeInTheDocument();
});

it('una línea sin unidades listas ni entregadas muestra solo Pendiente', async () => {
  cargar(comanda([linea(1, 4, 0)]));
  const dialogo = await abrir();
  expect(within(dialogo).getByText('Listas para servir: 0')).toBeInTheDocument();
  expect(within(dialogo).getByText('Pendiente')).toBeInTheDocument();
  expect(within(dialogo).queryByText('Listo para servir')).not.toBeInTheDocument();
  expect(within(dialogo).queryByText('Entregado')).not.toBeInTheDocument();
});

it('Todo listo envía la cantidad pedida y la línea figura Listo para servir', async () => {
  cargar(comanda([linea(1, 3, 0)]));
  responderListo(comanda([linea(1, 3, 0, false, 3)]));
  await abrir();
  fireEvent.click(boton('Marcar todo listo de Producto #11'));
  expect(api.marcarListo).toHaveBeenCalledWith(3, 1, 3);
  expect(await screen.findByText('Listo para servir')).toBeInTheDocument();
  expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
  expect(screen.getByText('Listas para servir: 3')).toBeInTheDocument();
});

it('+ de listo envía entregadas + listas + 1 y − envía entregadas + listas − 1', async () => {
  cargar(comanda([linea(1, 10, 0, false, 2)]));
  responderListo(comanda([linea(1, 10, 0, false, 3)]));
  await abrir();
  fireEvent.click(boton('Marcar una unidad lista de Producto #11'));
  expect(api.marcarListo).toHaveBeenLastCalledWith(3, 1, 3);
  expect(await screen.findByText('Listas para servir: 3')).toBeInTheDocument();
  responderListo(comanda([linea(1, 10, 0, false, 2)]));
  fireEvent.click(boton('Quitar una unidad lista de Producto #11'));
  expect(api.marcarListo).toHaveBeenLastCalledWith(3, 1, 2);
  expect(await screen.findByText('Listas para servir: 2')).toBeInTheDocument();
});

it('con entregas parciales el valor enviado nunca baja de lo entregado', async () => {
  cargar(comanda([linea(1, 10, 4, false, 6)])); // e 4, listas 2
  responderListo(comanda([linea(1, 10, 4, false, 5)]));
  await abrir();
  fireEvent.click(boton('Quitar una unidad lista de Producto #11'));
  expect(api.marcarListo).toHaveBeenLastCalledWith(3, 1, 5);
  responderListo(comanda([linea(1, 10, 4, false, 4)]));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Quitar una unidad lista de Producto #11' }),
  );
  await waitFor(() => expect(api.marcarListo).toHaveBeenLastCalledWith(3, 1, 4));
});

it('con lista menor que lo entregado + sigue habilitado y envía entregadas + 1', async () => {
  cargar(comanda([linea(1, 10, 6, false, 2)])); // l < e: 0 listas
  responderListo(comanda([linea(1, 10, 6, false, 7)]));
  await abrir();
  expect(boton('Quitar una unidad lista de Producto #11')).toBeDisabled();
  expect(boton('Marcar una unidad lista de Producto #11')).toBeEnabled();
  fireEvent.click(boton('Marcar una unidad lista de Producto #11'));
  expect(api.marcarListo).toHaveBeenCalledWith(3, 1, 7);
});

it('deshabilita marcar sin pendientes y quitar sin listas', async () => {
  cargar(comanda([linea(1, 3, 0, false, 3), linea(2, 5, 0)]));
  await abrir();
  expect(boton('Marcar una unidad lista de Producto #11')).toBeDisabled();
  expect(boton('Marcar todo listo de Producto #11')).toBeDisabled();
  expect(boton('Quitar una unidad lista de Producto #11')).toBeEnabled();
  expect(boton('Quitar una unidad lista de Producto #12')).toBeDisabled();
  expect(boton('Marcar una unidad lista de Producto #12')).toBeEnabled();
  expect(boton('Marcar todo listo de Producto #12')).toBeEnabled();
});

it('una línea entregada por completo deshabilita los controles de listo', async () => {
  cargar(comanda([linea(1, 3, 3, false, 3)]));
  await abrir();
  for (const nombre of [
    'Marcar una unidad lista de Producto #11',
    'Quitar una unidad lista de Producto #11',
    'Marcar todo listo de Producto #11',
  ]) {
    expect(boton(nombre)).toBeDisabled();
  }
});

it('el chef ve los controles de listo, no los de entrega, y el título Detalle', async () => {
  cargar(comanda([linea(1, 10, 2)]));
  await abrir(false, true);
  expect(screen.getByRole('dialog', { name: /Detalle de la comanda #3/ })).toBeInTheDocument();
  expect(boton('Marcar una unidad lista de Producto #11')).toBeEnabled();
  expect(boton('Marcar todo listo de Producto #11')).toBeEnabled();
  expect(screen.queryByRole('button', { name: /Sumar|Restar|Entregar todo/ })).toBeNull();
});

it('quien solo entrega no ve controles de listo y el título es Entregas', async () => {
  cargar(comanda([linea(1, 10, 2)]));
  await abrir(true, false);
  expect(screen.getByRole('dialog', { name: /Entregas de la comanda #3/ })).toBeInTheDocument();
  expect(boton('Sumar una unidad de Producto #11')).toBeEnabled();
  expect(screen.queryByRole('button', { name: /lista|listo/ })).toBeNull();
});

it('sin ningún permiso muestra el detalle sin botones de línea', async () => {
  cargar(comanda([linea(1, 10, 2, false, 5)]));
  const dialogo = await abrir(false, false);
  expect(within(dialogo).getByText('Listas para servir: 3')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /unidad|todo/ })).toBeNull();
});

it('el mozo entrega todo sobre una línea lista y figura Entregado', async () => {
  cargar(comanda([linea(1, 3, 0, false, 3)]));
  responder(comanda([linea(1, 3, 3, false, 3)]));
  await abrir();
  fireEvent.click(boton('Entregar todo de Producto #11'));
  expect(api.registrarEntrega).toHaveBeenCalledWith(3, 1, 3);
  expect(await screen.findByText('Entregado')).toBeInTheDocument();
  expect(screen.queryByText('Listo para servir')).not.toBeInTheDocument();
});

it('Entregar todo sigue habilitado con la línea sin marcar como lista', async () => {
  cargar(comanda([linea(1, 3, 0)]));
  await abrir();
  expect(boton('Entregar todo de Producto #11')).toBeEnabled();
});

it.each(['CERRADA', 'ANULADA'] as const)(
  'con la comanda %s los controles de listo quedan deshabilitados y se ven los estados',
  async (estado) => {
    cargar(comanda([linea(1, 10, 2, false, 7)], estado));
    const dialogo = await abrir();
    expect(within(dialogo).getByText('Listas para servir: 5')).toBeInTheDocument();
    for (const nombre of [
      'Marcar una unidad lista de Producto #11',
      'Quitar una unidad lista de Producto #11',
      'Marcar todo listo de Producto #11',
    ]) {
      expect(boton(nombre)).toBeDisabled();
    }
  },
);

it('bloquea los controles de listo mientras hay una llamada en vuelo', async () => {
  cargar(comanda([linea(1, 10, 0), linea(2, 5, 0)]));
  let resolver: (r: { exito: true; datos: EntregasComanda }) => void = () => undefined;
  vi.mocked(api.marcarListo).mockReturnValue(new Promise((r) => (resolver = r)));
  await abrir();
  fireEvent.click(boton('Marcar una unidad lista de Producto #11'));
  await waitFor(() => expect(boton('Marcar una unidad lista de Producto #12')).toBeDisabled());
  expect(boton('Marcar todo listo de Producto #12')).toBeDisabled();
  resolver({ exito: true, datos: comanda([linea(1, 10, 0, false, 1), linea(2, 5, 0)]) });
  expect(await screen.findByText('Listas para servir: 1')).toBeInTheDocument();
  expect(boton('Marcar una unidad lista de Producto #12')).toBeEnabled();
});

it('ante un 409 al marcar listo muestra el mensaje y recarga las entregas', async () => {
  cargar(comanda([linea(1, 3, 0)]));
  vi.mocked(api.marcarListo).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'La línea ya se entregó por completo',
  });
  await abrir();
  vi.mocked(api.consultarEntregas).mockResolvedValue({
    exito: true,
    datos: comanda([linea(1, 3, 3, false, 0)]),
  });
  fireEvent.click(boton('Marcar todo listo de Producto #11'));
  expect(await screen.findByRole('alert')).toHaveTextContent('ya se entregó por completo');
  await waitFor(() => expect(api.consultarEntregas).toHaveBeenCalledTimes(2));
  expect(await screen.findByText('3 de 3')).toBeInTheDocument();
  expect(boton('Marcar todo listo de Producto #11')).toBeDisabled();
});
