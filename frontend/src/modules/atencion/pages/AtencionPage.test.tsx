import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
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
}));

const COMANDA = {
  id: 3,
  mesa_id: 7,
  estado: 'ABIERTA' as const,
  fecha_hora: '2026-10-31T12:30:00Z',
};
const PAGINA = { items: [COMANDA], total: 1, limit: 50, offset: 0 };

function Ruta() {
  const ubicacion = useLocation();
  return <p data-testid="ruta">{`${ubicacion.pathname}${ubicacion.search}`}</p>;
}

/** La página usa el router (`?nueva=1`): se monta en una ruta, que por defecto es `/atencion`. */
function renderizarPagina(ruta = '/atencion') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AtencionPage />
      <Ruta />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
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
  const vista = renderizarPagina();
  expect(
    await screen.findByRole('heading', { name: 'No hay comandas registradas' }),
  ).toBeInTheDocument();
  vista.unmount();
  vi.mocked(api.listarComandas).mockResolvedValue({
    exito: true,
    datos: { ...PAGINA, items: [{ ...COMANDA, estado: 'CERRADA' }] },
  });
  renderizarPagina();
  expect(await screen.findByRole('button', { name: 'Cerrar comanda #3' })).toBeDisabled();
});

it('usa estados vacíos distintos para colección sin registros y filtros sin coincidencias', async () => {
  vi.mocked(api.listarComandas)
    .mockResolvedValueOnce({ exito: true, datos: PAGINA })
    .mockResolvedValueOnce({ exito: true, datos: { ...PAGINA, items: [], total: 0 } });
  renderizarPagina();
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
  renderizarPagina();
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
  renderizarPagina();
  const estadoComandas = screen.getByText('Cargando comandas…');
  expect(estadoComandas.parentElement).toHaveAttribute('role', 'status');
  resolver?.({ exito: true, datos: PAGINA });
  expect(await screen.findByText('Comanda #3')).toBeInTheDocument();
});

it('lista, filtra por mesa y estado y reinicia el desplazamiento', async () => {
  renderizarPagina();
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
  renderizarPagina();
  expect(await screen.findByRole('heading', { name: 'Página sin comandas' })).toBeInTheDocument();
  expect(screen.queryByText('No hay comandas para estos filtros.')).not.toBeInTheDocument();
});

it('crea un pedido usando únicamente referencias, cantidades y observaciones', async () => {
  vi.mocked(api.crearComanda).mockResolvedValue({
    exito: true,
    datos: { ...COMANDA, detalles: [] },
  });
  renderizarPagina();
  fireEvent.click(screen.getByRole('button', { name: 'Nueva comanda' }));
  fireEvent.change(screen.getByLabelText('Mesa (ID)'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Referencia 1 (ID)'), { target: { value: '12' } });
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
  renderizarPagina();
  fireEvent.click(screen.getByRole('button', { name: 'Nueva comanda' }));
  fireEvent.change(screen.getByLabelText('Mesa (ID)'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Referencia 1 (ID)'), { target: { value: '12' } });
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
  renderizarPagina();
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
  renderizarPagina();
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
  renderizarPagina();
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
  renderizarPagina();
  fireEvent.click(await screen.findByRole('button', { name: 'Cerrar comanda #3' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Gestionar entregas' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Entregar todo de Producto #12' }));
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
  renderizarPagina();
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
  renderizarPagina();
  fireEvent.click(await screen.findByRole('button', { name: 'Cerrar comanda #3' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar cierre' }));
  expect(await screen.findByText(/Detalle #81/)).toBeInTheDocument();
  expect(screen.queryByText('Comanda cerrada')).not.toBeInTheDocument();
});

it('cancela el cierre sin llamar a la acción de negocio', async () => {
  renderizarPagina();
  fireEvent.click(await screen.findByRole('button', { name: 'Cerrar comanda #3' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(api.cerrarComanda).not.toHaveBeenCalled();
});

it('ofrece anular solo para comandas ABIERTA y cancela sin solicitar la operación', async () => {
  const { ConfirmProvider } = await import('../../../shared/components/ui/confirm-dialog');
  render(
    <MemoryRouter>
      <ConfirmProvider>
        <AtencionPage />
      </ConfirmProvider>
    </MemoryRouter>,
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
    <MemoryRouter>
      <ConfirmProvider>
        <AtencionPage />
      </ConfirmProvider>
    </MemoryRouter>,
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
    <MemoryRouter>
      <ConfirmProvider>
        <AtencionPage />
      </ConfirmProvider>
    </MemoryRouter>,
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
  renderizarPagina();
  fireEvent.click(await screen.findByRole('button', { name: 'Cerrar comanda #3' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron leer las entregas');
  expect(screen.queryByRole('button', { name: 'Confirmar cierre' })).not.toBeInTheDocument();
  expect(api.cerrarComanda).not.toHaveBeenCalled();
});

it('pagina conservando los filtros y muestra errores de listado con reintento', async () => {
  vi.mocked(api.listarComandas)
    .mockResolvedValueOnce({ exito: false, datos: null, error: 'Sin conexión' })
    .mockResolvedValue({ exito: true, datos: { ...PAGINA, total: 60 } });
  renderizarPagina();
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
  renderizarPagina();
  fireEvent.click(screen.getByRole('button', { name: 'Nueva comanda' }));
  fireEvent.change(screen.getByLabelText('Mesa (ID)'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Referencia 1 (ID)'), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText('Cantidad 1'), { target: { value: '1.5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comanda' }));
  expect(api.crearComanda).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Cantidad 1'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar línea' }));
  fireEvent.change(screen.getByLabelText('Tipo 2'), { target: { value: 'menu' } });
  fireEvent.change(screen.getByLabelText('Referencia 2 (ID)'), { target: { value: '5' } });
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

// S4-06 (N01 a N05): `?nueva=1` abre el alta de comanda.
it('abre el alta con /atencion?nueva=1 y deja la URL sin el parámetro', async () => {
  renderizarPagina('/atencion?nueva=1');

  expect(await screen.findByLabelText('Mesa (ID)')).toBeInTheDocument();
  expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/atencion$/);
});

it('no abre el alta sin parámetro', async () => {
  renderizarPagina('/atencion');

  await screen.findByText('Comanda #3');
  expect(screen.queryByLabelText('Mesa (ID)')).not.toBeInTheDocument();
});

it('ignora nueva=abc: no abre el alta ni muestra error', async () => {
  renderizarPagina('/atencion?nueva=abc');

  await screen.findByText('Comanda #3');
  expect(screen.queryByLabelText('Mesa (ID)')).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('conserva mesa=5 al abrir el alta con nueva=1', async () => {
  renderizarPagina('/atencion?nueva=1&mesa=5');

  expect(await screen.findByLabelText('Mesa (ID)')).toBeInTheDocument();
  expect(screen.getByTestId('ruta')).toHaveTextContent('/atencion?mesa=5');
});

it('no vuelve a abrir el alta una vez cerrada', async () => {
  renderizarPagina('/atencion?nueva=1');
  await screen.findByLabelText('Mesa (ID)');

  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

  await waitFor(() => expect(screen.queryByLabelText('Mesa (ID)')).not.toBeInTheDocument());
  expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/atencion$/);
});
