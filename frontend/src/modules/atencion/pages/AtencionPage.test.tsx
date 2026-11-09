import { fireEvent, render as renderBase, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api';
import { AtencionPage } from './AtencionPage';

vi.mock('../api', () => ({
  listarComandas: vi.fn(),
  crearComanda: vi.fn(),
  cerrarComanda: vi.fn(),
  anularComanda: vi.fn(),
  consultarPendientes: vi.fn(),
  consultarEntregas: vi.fn(),
  registrarEntrega: vi.fn(),
  listarClientes: vi.fn(),
  modificarCliente: vi.fn(),
  listarMesas: vi.fn(),
  listarProductos: vi.fn(),
  listarMenusEjecutivos: vi.fn(),
}));

// AtencionPage usa useNavigate y useSearchParams: toda prueba necesita un router.
function render(ui: ReactElement) {
  return renderBase(ui, { wrapper: MemoryRouter });
}

function UbicacionActual() {
  const ubicacion = useLocation();
  return <p data-testid="ubicacion">{ubicacion.pathname + ubicacion.search}</p>;
}

function renderEn(ruta: string) {
  return renderBase(
    <MemoryRouter initialEntries={[ruta]}>
      <AtencionPage />
      <UbicacionActual />
    </MemoryRouter>,
  );
}

const COMANDA = {
  id: 3,
  mesa_id: 7,
  estado: 'ABIERTA' as const,
  fecha_hora: '2026-10-31T12:30:00Z',
};
const PAGINA = { items: [COMANDA], total: 1, limit: 50, offset: 0 };

const pagina = <T,>(items: T[]) => ({
  exito: true,
  datos: { items, total: items.length, limit: 100, offset: 0 },
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.listarMesas).mockResolvedValue(
    pagina([
      { id: 7, numero: 7, sector: { id: 1, nombre: 'Salón' }, estado: 'LIBRE' as const },
      { id: 8, numero: 8, sector: { id: 1, nombre: 'Salón' }, estado: 'OCUPADA' as const },
    ]),
  );
  vi.mocked(api.listarProductos).mockResolvedValue(
    pagina([{ id: 12, nombre: 'Milanesa', precio: '9000.00', estado: 'HABILITADO' as const }]),
  );
  vi.mocked(api.listarMenusEjecutivos).mockResolvedValue(
    pagina([
      { id: 5, nombre: 'Menú del día', precio_fijo: '12000.00', estado: 'HABILITADO' as const },
    ]),
  );
  vi.mocked(api.listarComandas).mockResolvedValue({ exito: true, datos: PAGINA });
  vi.mocked(api.listarClientes).mockResolvedValue({
    exito: true,
    datos: { items: [], total: 0, limit: 50, offset: 0 },
  });
  vi.mocked(api.consultarPendientes).mockResolvedValue({
    exito: true,
    datos: { comanda_id: 3, pendientes: [] },
  });
});

it('informa conjunto vacío y no ofrece cerrar comandas ya cerradas', async () => {
  vi.mocked(api.listarComandas).mockResolvedValueOnce({
    exito: true,
    datos: { ...PAGINA, items: [], total: 0 },
  });
  const vista = render(<AtencionPage />);
  expect(
    await screen.findByRole('heading', { name: 'No hay comandas registradas' }),
  ).toBeInTheDocument();
  vista.unmount();
  vi.mocked(api.listarComandas).mockResolvedValue({
    exito: true,
    datos: { ...PAGINA, items: [{ ...COMANDA, estado: 'CERRADA' }] },
  });
  render(<AtencionPage />);
  expect(await screen.findByRole('button', { name: 'Cerrar comanda #3' })).toBeDisabled();
});

it('usa estados vacíos distintos para colección sin registros y filtros sin coincidencias', async () => {
  vi.mocked(api.listarComandas)
    .mockResolvedValueOnce({ exito: true, datos: PAGINA })
    .mockResolvedValueOnce({ exito: true, datos: { ...PAGINA, items: [], total: 0 } });
  render(<AtencionPage />);
  expect(await screen.findByText('Comanda #3')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'CERRADA' } });
  fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
  expect(await screen.findByRole('heading', { name: 'Sin coincidencias' })).toBeInTheDocument();
});

it('muestra error compartido en vez de tratar un fallo HTTP como lista vacía', async () => {
  vi.mocked(api.listarComandas).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'HTTP 500',
  });
  render(<AtencionPage />);
  expect(
    await screen.findByRole('heading', { name: 'No se pudieron cargar los datos' }),
  ).toBeInTheDocument();
  expect(screen.getByText('HTTP 500')).toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'No hay comandas registradas' }),
  ).not.toBeInTheDocument();
});

it('usa el indicador de carga compartido mientras espera el listado', async () => {
  let resolver: ((respuesta: Awaited<ReturnType<typeof api.listarComandas>>) => void) | undefined;
  vi.mocked(api.listarComandas).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolver = resolve;
      }),
  );
  render(<AtencionPage />);
  const estadoComandas = screen.getByText('Cargando comandas…');
  expect(estadoComandas.parentElement).toHaveAttribute('role', 'status');
  resolver?.({ exito: true, datos: PAGINA });
  expect(await screen.findByText('Comanda #3')).toBeInTheDocument();
});

it('lista, filtra por mesa y estado y reinicia el desplazamiento', async () => {
  render(<AtencionPage />);
  expect(await screen.findByText('Comanda #3')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Filtrar por mesa (ID)'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'CERRADA' } });
  fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
  await waitFor(() =>
    expect(api.listarComandas).toHaveBeenLastCalledWith({
      mesa_id: 7,
      estado: 'CERRADA',
      limit: 50,
      offset: 0,
    }),
  );
});

it('distingue una página desplazada vacía del conjunto sin comandas', async () => {
  vi.mocked(api.listarComandas).mockResolvedValue({
    exito: true,
    datos: { ...PAGINA, items: [], total: 4, offset: 50 },
  });
  render(<AtencionPage />);
  expect(await screen.findByRole('heading', { name: 'Página sin comandas' })).toBeInTheDocument();
  expect(screen.queryByText('No hay comandas para estos filtros.')).not.toBeInTheDocument();
});

it('crea un pedido eligiendo mesa y producto de los selectores', async () => {
  vi.mocked(api.crearComanda).mockResolvedValue({
    exito: true,
    datos: { ...COMANDA, detalles: [] },
  });
  render(<AtencionPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Nueva comanda' }));
  await screen.findByRole('option', { name: 'Mesa 7 · Salón' });
  fireEvent.change(screen.getByLabelText('Mesa'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Producto 1'), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText('Cantidad 1'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comanda' }));
  await waitFor(() =>
    expect(api.crearComanda).toHaveBeenCalledWith({
      mesa_id: 7,
      observaciones: null,
      detalles: [{ producto_id: 12, menu_ejecutivo_id: null, cantidad: 2 }],
    }),
  );
  expect(await screen.findByText('Comanda creada')).toBeInTheDocument();
});

it('informa integración no disponible sin simular una creación', async () => {
  vi.mocked(api.crearComanda).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'Alta pendiente de integración',
  });
  render(<AtencionPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Nueva comanda' }));
  await screen.findByRole('option', { name: 'Mesa 7 · Salón' });
  fireEvent.change(screen.getByLabelText('Mesa'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Producto 1'), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comanda' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Alta pendiente de integración');
  expect(screen.queryByText('Comanda creada')).not.toBeInTheDocument();
});

const PENDIENTE_81 = { id: 81, producto_id: 12, menu_ejecutivo_id: null, cantidad: 2 };

function entregas(entregada: number, estado: 'ABIERTA' | 'CERRADA' = 'ABIERTA') {
  return {
    comanda_id: 3,
    estado,
    detalles: [
      {
        ...PENDIENTE_81,
        cantidad_entregada: entregada,
        estado_entrega: entregada === 2 ? ('ENTREGADO' as const) : ('PENDIENTE' as const),
      },
    ],
  };
}

it('consulta A02 antes de confirmar, informa detalles y ofrece gestionar entregas', async () => {
  vi.mocked(api.consultarPendientes).mockResolvedValue({
    exito: true,
    datos: { comanda_id: 3, pendientes: [PENDIENTE_81] },
  });
  render(<AtencionPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cerrar comanda #3' }));
  const dialogo = await screen.findByRole('dialog');
  expect(within(dialogo).getByText(/Detalle #81/)).toBeInTheDocument();
  expect(
    within(dialogo).queryByRole('button', { name: 'Confirmar cierre' }),
  ).not.toBeInTheDocument();
  expect(within(dialogo).getByRole('button', { name: 'Gestionar entregas' })).toBeInTheDocument();
  expect(within(dialogo).queryByText(/pendiente de integración/)).not.toBeInTheDocument();
  expect(api.cerrarComanda).not.toHaveBeenCalled();
});

it('abre las entregas desde la fila de una comanda en cualquier estado', async () => {
  vi.mocked(api.listarComandas).mockResolvedValue({
    exito: true,
    datos: { ...PAGINA, items: [{ ...COMANDA, estado: 'CERRADA' }] },
  });
  vi.mocked(api.consultarEntregas).mockResolvedValue({
    exito: true,
    datos: entregas(2, 'CERRADA'),
  });
  render(<AtencionPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Entregas de la comanda #3' }));
  const dialogo = await screen.findByRole('dialog');
  expect(api.consultarEntregas).toHaveBeenCalledWith(3);
  expect(await within(dialogo).findByText('2 de 2')).toBeInTheDocument();
  fireEvent.click(within(dialogo).getByRole('button', { name: 'Volver' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('intercambia el cierre y las entregas sin anidar modales y recarga los pendientes', async () => {
  vi.mocked(api.consultarPendientes)
    .mockResolvedValueOnce({ exito: true, datos: { comanda_id: 3, pendientes: [PENDIENTE_81] } })
    .mockResolvedValueOnce({ exito: true, datos: { comanda_id: 3, pendientes: [] } });
  vi.mocked(api.consultarEntregas).mockResolvedValue({ exito: true, datos: entregas(0) });
  render(<AtencionPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cerrar comanda #3' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Gestionar entregas' }));
  expect(await screen.findByText('Entregas de la comanda #3')).toBeInTheDocument();
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(screen.queryByText('Cerrar comanda #3')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
  expect(await screen.findByText('Cerrar comanda #3')).toBeInTheDocument();
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(await screen.findByRole('button', { name: 'Confirmar cierre' })).toBeInTheDocument();
  expect(api.consultarPendientes).toHaveBeenCalledTimes(2);
});

it('cierra la comanda tras entregar todo desde el modal de entregas', async () => {
  vi.mocked(api.consultarPendientes)
    .mockResolvedValueOnce({ exito: true, datos: { comanda_id: 3, pendientes: [PENDIENTE_81] } })
    .mockResolvedValueOnce({ exito: true, datos: { comanda_id: 3, pendientes: [] } });
  vi.mocked(api.consultarEntregas).mockResolvedValue({ exito: true, datos: entregas(0) });
  vi.mocked(api.registrarEntrega).mockResolvedValue({ exito: true, datos: entregas(2) });
  vi.mocked(api.cerrarComanda).mockResolvedValue({
    exito: true,
    datos: { ...COMANDA, estado: 'CERRADA', detalles: [] },
  });
  render(<AtencionPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cerrar comanda #3' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Gestionar entregas' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Entregar todo de Milanesa' }));
  expect(await screen.findByText('No falta servir nada')).toBeInTheDocument();
  expect(api.registrarEntrega).toHaveBeenCalledWith(3, 81, 2);
  fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar cierre' }));
  await waitFor(() => expect(api.cerrarComanda).toHaveBeenCalledWith(3));
  expect(await screen.findByText('Comanda cerrada')).toBeInTheDocument();
});

it('solo cierra tras confirmar y actualiza el listado', async () => {
  vi.mocked(api.cerrarComanda).mockResolvedValue({
    exito: true,
    datos: { ...COMANDA, estado: 'CERRADA', detalles: [] },
  });
  render(<AtencionPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cerrar comanda #3' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar cierre' }));
  await waitFor(() => expect(api.cerrarComanda).toHaveBeenCalledWith(3));
  expect(await screen.findByText('Comanda cerrada')).toBeInTheDocument();
});

it('ante conflicto reconsulta pendientes sin anunciar cierre exitoso', async () => {
  vi.mocked(api.cerrarComanda).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'Hay entregas pendientes',
  });
  vi.mocked(api.consultarPendientes)
    .mockResolvedValueOnce({ exito: true, datos: { comanda_id: 3, pendientes: [] } })
    .mockResolvedValueOnce({
      exito: true,
      datos: {
        comanda_id: 3,
        pendientes: [{ id: 81, producto_id: 12, cantidad: 2, menu_ejecutivo_id: null }],
      },
    });
  render(<AtencionPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cerrar comanda #3' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar cierre' }));
  expect(await screen.findByText(/Detalle #81/)).toBeInTheDocument();
  expect(screen.queryByText('Comanda cerrada')).not.toBeInTheDocument();
});

it('cancela el cierre sin llamar a la acción de negocio', async () => {
  render(<AtencionPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cerrar comanda #3' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(api.cerrarComanda).not.toHaveBeenCalled();
});

it('ofrece anular solo para comandas ABIERTA y cancela sin solicitar la operación', async () => {
  const { ConfirmProvider } = await import('../../../shared/components/ui/confirm-dialog');
  render(
    <ConfirmProvider>
      <AtencionPage />
    </ConfirmProvider>,
  );
  expect(await screen.findByRole('button', { name: 'Anular comanda #3' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Anular comanda #3' }));
  expect(await screen.findByRole('dialog')).toHaveTextContent(
    '¿Confirmás que querés anular la comanda #3?',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(api.anularComanda).not.toHaveBeenCalled();
});

it('confirma anulación, informa éxito y recarga conservando la fila histórica', async () => {
  const { ConfirmProvider } = await import('../../../shared/components/ui/confirm-dialog');
  vi.mocked(api.anularComanda).mockResolvedValue({
    exito: true,
    datos: { ...COMANDA, estado: 'ANULADA', detalles: [] },
  });
  render(
    <ConfirmProvider>
      <AtencionPage />
    </ConfirmProvider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Anular comanda #3' }));
  fireEvent.click(screen.getByRole('button', { name: 'Anular comanda' }));
  await waitFor(() => expect(api.anularComanda).toHaveBeenCalledWith(3));
  expect(await screen.findByText('Comanda anulada')).toBeInTheDocument();
  expect(await screen.findByText('Comanda #3')).toBeInTheDocument();
  expect(api.listarComandas).toHaveBeenCalledTimes(2);
});

it('muestra el motivo de rechazo al anular y recarga el estado actual', async () => {
  const { ConfirmProvider } = await import('../../../shared/components/ui/confirm-dialog');
  vi.mocked(api.anularComanda).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'No se puede anular porque está facturada',
  });
  render(
    <ConfirmProvider>
      <AtencionPage />
    </ConfirmProvider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Anular comanda #3' }));
  fireEvent.click(screen.getByRole('button', { name: 'Anular comanda' }));
  expect(await screen.findByText('No se puede anular porque está facturada')).toBeInTheDocument();
  expect(screen.queryByText('Comanda anulada')).not.toBeInTheDocument();
  expect(api.listarComandas).toHaveBeenCalledTimes(2);
});

it('ante fallo de consulta de entregas no habilita la confirmación', async () => {
  vi.mocked(api.consultarPendientes).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'No se pudieron leer las entregas',
  });
  render(<AtencionPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cerrar comanda #3' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron leer las entregas');
  expect(screen.queryByRole('button', { name: 'Confirmar cierre' })).not.toBeInTheDocument();
  expect(api.cerrarComanda).not.toHaveBeenCalled();
});

it('pagina conservando los filtros y muestra errores de listado con reintento', async () => {
  vi.mocked(api.listarComandas)
    .mockResolvedValueOnce({ exito: false, datos: null, error: 'Sin conexión' })
    .mockResolvedValue({ exito: true, datos: { ...PAGINA, total: 60 } });
  render(<AtencionPage />);
  expect(
    await screen.findByRole('heading', { name: 'No se pudieron cargar los datos' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Sin conexión')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByText('Comanda #3');
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() =>
    expect(api.listarComandas).toHaveBeenLastCalledWith({ limit: 50, offset: 50 }),
  );
});

it('impide cantidades fraccionarias y admite varias líneas de producto y menú', async () => {
  vi.mocked(api.crearComanda).mockResolvedValue({
    exito: true,
    datos: { ...COMANDA, detalles: [] },
  });
  render(<AtencionPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Nueva comanda' }));
  await screen.findByRole('option', { name: 'Mesa 7 · Salón' });
  fireEvent.change(screen.getByLabelText('Mesa'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Producto 1'), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText('Cantidad 1'), { target: { value: '1.5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comanda' }));
  expect(api.crearComanda).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Cantidad 1'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar línea' }));
  fireEvent.change(screen.getByLabelText('Tipo 2'), { target: { value: 'menu' } });
  fireEvent.change(screen.getByLabelText('Menú 2'), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comanda' }));
  await waitFor(() =>
    expect(api.crearComanda).toHaveBeenCalledWith({
      mesa_id: 7,
      observaciones: null,
      detalles: [
        { producto_id: 12, menu_ejecutivo_id: null, cantidad: 2 },
        { producto_id: null, menu_ejecutivo_id: 5, cantidad: 1 },
      ],
    }),
  );
});

describe('AtencionPage · enlace Mesa → Comanda (S4-03)', () => {
  it('?mesa=7 abre «Nueva comanda» con la mesa elegida y limpia el parámetro (E02)', async () => {
    renderEn('/atencion?mesa=7');
    expect(await screen.findByRole('heading', { name: 'Nueva comanda' })).toBeInTheDocument();
    await screen.findByRole('option', { name: 'Mesa 7 · Salón' });
    expect(screen.getByLabelText('Mesa')).toHaveValue('7');
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(/^\/atencion$/);
  });

  it('?mesa=8 (ocupada) abre el formulario sin preselección ni error (E04)', async () => {
    renderEn('/atencion?mesa=8');
    await screen.findByRole('option', { name: 'Mesa 7 · Salón' });
    await waitFor(() => expect(screen.getByLabelText('Mesa')).toHaveValue(''));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('?mesa=99 (inexistente) abre el formulario sin preselección ni error (E04)', async () => {
    renderEn('/atencion?mesa=99');
    await screen.findByRole('option', { name: 'Mesa 7 · Salón' });
    expect(screen.getByLabelText('Mesa')).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['abc', '0', '-3'])(
    '?mesa=%s se ignora y el formulario no se abre (E05)',
    async (valor) => {
      renderEn(`/atencion?mesa=${valor}`);
      await screen.findByText('Comanda #3');
      expect(screen.queryByRole('heading', { name: 'Nueva comanda' })).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it('sin parámetro el formulario permanece cerrado (E06)', async () => {
    renderEn('/atencion');
    await screen.findByText('Comanda #3');
    expect(screen.queryByRole('heading', { name: 'Nueva comanda' })).not.toBeInTheDocument();
  });
});

describe('AtencionPage · enlace Comanda → Factura (S4-03)', () => {
  const CERRADA = { ...COMANDA, id: 4, estado: 'CERRADA' as const };
  const ANULADA = { ...COMANDA, id: 5, estado: 'ANULADA' as const };

  it('ofrece «Facturar» solo en comandas CERRADA (E12)', async () => {
    vi.mocked(api.listarComandas).mockResolvedValue({
      exito: true,
      datos: { ...PAGINA, items: [COMANDA, CERRADA, ANULADA], total: 3 },
    });
    render(<AtencionPage />);
    await screen.findByText('Comanda #4');
    expect(screen.getAllByRole('button', { name: /^Facturar comanda/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Facturar comanda #4' })).toBeInTheDocument();
  });

  it('«Facturar» navega a /pagos?comanda=<id> (E07)', async () => {
    vi.mocked(api.listarComandas).mockResolvedValue({
      exito: true,
      datos: { ...PAGINA, items: [CERRADA], total: 1 },
    });
    renderEn('/atencion');
    fireEvent.click(await screen.findByRole('button', { name: 'Facturar comanda #4' }));
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/pagos?comanda=4');
  });

  it('sin comandas no hay acciones (E13)', async () => {
    vi.mocked(api.listarComandas).mockResolvedValue({
      exito: true,
      datos: { ...PAGINA, items: [], total: 0 },
    });
    render(<AtencionPage />);
    await screen.findByRole('heading', { name: 'No hay comandas registradas' });
    expect(screen.queryByRole('button', { name: /Facturar comanda/ })).not.toBeInTheDocument();
  });
});
