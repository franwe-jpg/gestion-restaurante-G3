import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import * as api from '../api';
import { ComandaFormDialog } from './ComandaForm';

vi.mock('../api', () => ({
  crearComanda: vi.fn(),
  listarMesas: vi.fn(),
  listarMozosHabilitados: vi.fn(),
  listarProductos: vi.fn(),
  listarMenusEjecutivos: vi.fn(),
}));

const sector = { id: 1, nombre: 'Salón' };
const OCUPADA = { id: 2, numero: 5, sector, estado: 'OCUPADA' as const };
const MESAS = [
  { id: 1, numero: 4, sector, estado: 'LIBRE' as const },
  OCUPADA,
  { id: 3, numero: 6, sector, estado: 'FUERA_DE_SERVICIO' as const },
];
const MOZOS = [
  { id: 31, nombre: 'Lucía', apellido: 'Fernández', estado: 'HABILITADO' as const },
  { id: 32, nombre: 'Lucía', apellido: 'Paz', estado: 'DESHABILITADO' as const },
  { id: 33, nombre: 'Ana', apellido: 'Gómez', estado: 'HABILITADO' as const },
];
const pagina = <T,>(items: T[]) => ({
  exito: true,
  datos: { items, total: items.length, limit: 100, offset: 0 },
});

function cargar(mesas = MESAS, productos = true, menus = true) {
  vi.mocked(api.listarMesas).mockResolvedValue(pagina(mesas));
  vi.mocked(api.listarMozosHabilitados).mockResolvedValue({
    exito: true,
    datos: MOZOS.filter((mozo) => mozo.estado === 'HABILITADO'),
  });
  vi.mocked(api.listarProductos).mockResolvedValue(
    pagina(
      productos
        ? [{ id: 11, nombre: 'Milanesa', precio: '9000.00', estado: 'HABILITADO' as const }]
        : [],
    ),
  );
  vi.mocked(api.listarMenusEjecutivos).mockResolvedValue(
    pagina(
      menus
        ? [
            {
              id: 21,
              nombre: 'Menú del día',
              precio_fijo: '12000.00',
              estado: 'HABILITADO' as const,
            },
          ]
        : [],
    ),
  );
}

async function seleccionarMozo(busqueda = 'Lucía') {
  const selector = screen.getByRole('combobox', { name: /^Mozo/ });
  fireEvent.change(selector, { target: { value: busqueda } });
  fireEvent.click(await screen.findByRole('option', { name: 'Lucía Fernández' }));
}

async function abrir(mesaInicial?: string) {
  const onCreada = vi.fn();
  render(<ComandaFormDialog onCreada={onCreada} mesaInicial={mesaInicial} onSalir={vi.fn()} />);
  await waitFor(() => expect(api.listarMesas).toHaveBeenCalled());
  return onCreada;
}

beforeEach(() => {
  vi.resetAllMocks();
  cargar();
});

it('ofrece solo mesas libres con número y sector y sin campo de ID', async () => {
  await abrir();
  const selector = await screen.findByLabelText('Mesa');
  await screen.findByRole('option', { name: 'Mesa 4 · Salón' });
  expect(within(selector).getAllByRole('option')).toHaveLength(2);
  const selectorMozo = screen.getByRole('combobox', { name: /^Mozo/ });
  fireEvent.change(selectorMozo, { target: { value: 'Lucía' } });
  expect(await screen.findByRole('option', { name: 'Lucía Fernández' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Lucía Fernández' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Lucía Paz' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Buscar mozo')).not.toBeInTheDocument();
  expect(api.listarMozosHabilitados).toHaveBeenLastCalledWith('Lucía');
  expect(screen.queryByLabelText('Mesa (ID)')).not.toBeInTheDocument();
  expect(screen.queryByText(/referencias se ingresan por ID/)).not.toBeInTheDocument();
});

it('envía la mesa, el producto y la cantidad elegidos', async () => {
  vi.mocked(api.crearComanda).mockResolvedValue({ exito: true, datos: null });
  const onCreada = await abrir();
  await screen.findByRole('option', { name: 'Mesa 4 · Salón' });
  await seleccionarMozo();
  fireEvent.change(screen.getByLabelText('Mesa'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Producto 1'), { target: { value: '11' } });
  fireEvent.change(screen.getByLabelText('Cantidad 1'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comanda' }));
  await waitFor(() =>
    expect(api.crearComanda).toHaveBeenCalledWith({
      mesa_id: 1,
      mozo_id: 31,
      observaciones: null,
      detalles: [{ producto_id: 11, menu_ejecutivo_id: null, cantidad: 2 }],
    }),
  );
  await waitFor(() => expect(onCreada).toHaveBeenCalled());
});

it('envía menu_ejecutivo_id al elegir un menú', async () => {
  vi.mocked(api.crearComanda).mockResolvedValue({ exito: true, datos: null });
  await abrir();
  await screen.findByRole('option', { name: 'Mesa 4 · Salón' });
  await seleccionarMozo();
  fireEvent.change(screen.getByLabelText('Mesa'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Tipo 1'), { target: { value: 'menu' } });
  fireEvent.change(screen.getByLabelText('Menú 1'), { target: { value: '21' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comanda' }));
  await waitFor(() =>
    expect(api.crearComanda).toHaveBeenCalledWith({
      mesa_id: 1,
      mozo_id: 31,
      observaciones: null,
      detalles: [{ producto_id: null, menu_ejecutivo_id: 21, cantidad: 1 }],
    }),
  );
});

it('sin mesas libres informa y bloquea el envío', async () => {
  cargar([OCUPADA]);
  await abrir();
  expect(await screen.findByText('No hay mesas libres')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeDisabled();
});

it('bloquea el alta cuando no hay mozos habilitados', async () => {
  vi.mocked(api.listarMozosHabilitados).mockResolvedValue({ exito: true, datos: [] });
  await abrir();
  expect(await screen.findByText('No hay mozos habilitados')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeDisabled();
});

it('no envía el texto escrito si todavía no se eligió una opción', async () => {
  await abrir();
  await screen.findByRole('option', { name: 'Mesa 4 · Salón' });
  fireEvent.change(screen.getByRole('combobox', { name: /^Mozo/ }), {
    target: { value: 'Lucía' },
  });
  await screen.findByRole('option', { name: 'Lucía Fernández' });
  fireEvent.change(screen.getByLabelText('Mesa'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Producto 1'), { target: { value: '11' } });

  expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeDisabled();
  expect(api.crearComanda).not.toHaveBeenCalled();
});

it('muestra el error del catálogo de mozos y bloquea el alta', async () => {
  vi.mocked(api.listarMozosHabilitados).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'Error al cargar mozos',
  });
  await abrir();
  expect(await screen.findByText('Error al cargar mozos')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeDisabled();
  expect(api.crearComanda).not.toHaveBeenCalled();
});

it('muestra un Alert si falla la carga y no permite enviar', async () => {
  vi.mocked(api.listarMesas).mockResolvedValue({ exito: false, datos: null, error: 'HTTP 500' });
  await abrir();
  expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 500');
  expect(screen.getByRole('button', { name: 'Guardar comanda' })).toBeDisabled();
  expect(api.crearComanda).not.toHaveBeenCalled();
});

it('conserva el diálogo y muestra el 409 si la mesa fue ocupada', async () => {
  vi.mocked(api.crearComanda).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'La mesa 4 no está libre',
  });
  const onCreada = await abrir();
  await screen.findByRole('option', { name: 'Mesa 4 · Salón' });
  await seleccionarMozo();
  fireEvent.change(screen.getByLabelText('Mesa'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Producto 1'), { target: { value: '11' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comanda' }));
  expect(await screen.findByText('La mesa 4 no está libre')).toBeInTheDocument();
  expect(onCreada).not.toHaveBeenCalled();
});

it('valida una línea sin selección sin llamar a la API', async () => {
  await abrir();
  await screen.findByRole('option', { name: 'Mesa 4 · Salón' });
  await seleccionarMozo();
  fireEvent.change(screen.getByLabelText('Mesa'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comanda' }));
  expect(await screen.findByText('Elegí un producto o menú en la línea 1')).toBeInTheDocument();
  expect(api.crearComanda).not.toHaveBeenCalled();
});

it.each(['El mozo 999 no existe', 'El mozo 31 está deshabilitado'])(
  'conserva el error de backend de mozo: %s',
  async (error) => {
    vi.mocked(api.crearComanda).mockResolvedValue({ exito: false, datos: null, error });
    await abrir();
    await screen.findByRole('option', { name: 'Mesa 4 · Salón' });
    await seleccionarMozo();
    fireEvent.change(screen.getByLabelText('Mesa'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Producto 1'), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar comanda' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(error);
  },
);

it('valida que haya una mesa elegida', async () => {
  await abrir();
  await screen.findByRole('option', { name: 'Mesa 4 · Salón' });
  await seleccionarMozo();
  fireEvent.change(screen.getByLabelText('Producto 1'), { target: { value: '11' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comanda' }));
  expect(await screen.findByText('Elegí una mesa')).toBeInTheDocument();
  expect(api.crearComanda).not.toHaveBeenCalled();
});

it('preselecciona la mesa inicial si está libre y la descarta si no', async () => {
  const vista = render(<ComandaFormDialog onCreada={vi.fn()} mesaInicial="1" onSalir={vi.fn()} />);
  await screen.findByRole('option', { name: 'Mesa 4 · Salón' });
  expect(screen.getByLabelText('Mesa')).toHaveValue('1');
  vista.unmount();
  render(<ComandaFormDialog onCreada={vi.fn()} mesaInicial="2" onSalir={vi.fn()} />);
  await screen.findAllByRole('option', { name: 'Mesa 4 · Salón' });
  await waitFor(() => expect(screen.getByLabelText('Mesa')).toHaveValue(''));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('ofrece el pie del diálogo con «Cancelar» y «Guardar comanda»', async () => {
  const onSalir = vi.fn();
  render(<ComandaFormDialog onCreada={vi.fn()} onSalir={onSalir} />);
  const dialogo = screen.getByRole('dialog', { name: 'Nueva comanda' });
  expect(within(dialogo).getByRole('button', { name: 'Guardar comanda' })).toBeDisabled();
  fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
  expect(onSalir).toHaveBeenCalled();
});
