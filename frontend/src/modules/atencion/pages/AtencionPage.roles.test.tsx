import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usarRoles } from '../../../test/sesionDePrueba';
import * as api from '../api';

import { AtencionPage } from './AtencionPage';

vi.mock('../api');

const COMANDA = {
  id: 3,
  mesa_id: 7,
  mozo_id: null,
  estado: 'ABIERTA' as const,
  fecha_hora: '2026-10-31T12:30:00Z',
};
const CERRADA = { ...COMANDA, id: 4, estado: 'CERRADA' as const };

const ENTREGAS_LISTAS = {
  comanda_id: 3,
  estado: 'ABIERTA' as const,
  detalles: [
    {
      id: 1,
      producto_id: 12,
      menu_ejecutivo_id: null,
      cantidad: 2,
      cantidad_entregada: 1,
      cantidad_lista: 2,
      estado_entrega: 'PENDIENTE' as const,
    },
  ],
};

const pagina = <T,>(items: T[]) => ({
  exito: true,
  datos: { items, total: items.length, limit: 100, offset: 0 },
});

function abrirEn(ruta = '/atencion') {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <AtencionPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.listarComandas).mockResolvedValue(pagina([COMANDA, CERRADA]));
  vi.mocked(api.listarClientes).mockResolvedValue(pagina([]));
  vi.mocked(api.listarMesas).mockResolvedValue(pagina([]));
  vi.mocked(api.listarProductos).mockResolvedValue(
    pagina([{ id: 12, nombre: 'Milanesa', precio: '9000.00', estado: 'HABILITADO' as const }]),
  );
  vi.mocked(api.listarMenusEjecutivos).mockResolvedValue(pagina([]));
  vi.mocked(api.listarMozosHabilitados).mockResolvedValue({ exito: true, datos: [] });
  vi.mocked(api.listarTodosMozos).mockResolvedValue({ exito: true, datos: [] });
  vi.mocked(api.consultarEntregas).mockResolvedValue({
    exito: true,
    datos: {
      comanda_id: 3,
      estado: 'ABIERTA',
      detalles: [
        {
          id: 1,
          producto_id: 12,
          menu_ejecutivo_id: null,
          cantidad: 2,
          cantidad_entregada: 1,
          cantidad_lista: 0,
          estado_entrega: 'PENDIENTE',
        },
      ],
    },
  });
});

describe('Atención: el encargado y el mozo operan', () => {
  it.each([['ENCARGADO'], ['MOZO']] as const)(
    'el %s ve todas las acciones, los clientes y «Nueva comanda»',
    async (rol) => {
      usarRoles([rol]);
      abrirEn();

      expect(await screen.findByText('Comanda #3')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Nueva comanda' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Entregas de la comanda #3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Modificar comanda #3' })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Cambiar mozo de la comanda #3' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cerrar comanda #3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Anular comanda #3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reabrir comanda #4' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Facturar comanda #4' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Clientes' })).toBeInTheDocument();
      expect(api.listarClientes).toHaveBeenCalled();
    },
  );
});

describe('Atención: el diálogo de entregas según el rol', () => {
  it.each([['ENCARGADO'], ['MOZO']] as const)(
    'el %s abre «Entregas» con los controles de entrega y de listo',
    async (rol) => {
      usarRoles([rol]);
      abrirEn();
      await screen.findByText('Comanda #3');

      fireEvent.click(screen.getByRole('button', { name: 'Entregas de la comanda #3' }));

      const dialogo = await screen.findByRole('dialog', { name: 'Entregas de la comanda #3' });
      expect(
        await within(dialogo).findByRole('button', { name: 'Sumar una unidad de Milanesa' }),
      ).toBeEnabled();
      expect(
        within(dialogo).getByRole('button', { name: 'Marcar una unidad lista de Milanesa' }),
      ).toBeEnabled();
      expect(
        within(dialogo).getByRole('button', { name: 'Entregar todo de Milanesa' }),
      ).toBeEnabled();
    },
  );
});

describe('Atención: el chef solo ve comandas', () => {
  beforeEach(() => usarRoles(['CHEF']));

  it('ve el listado con «Ver detalle» y sin crear, editar, entregas, cerrar, reabrir, anular ni facturar', async () => {
    abrirEn();

    expect(await screen.findByText('Comanda #3')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ver detalle de la comanda #3' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva comanda' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Entregas de la comanda/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Modificar comanda/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cambiar mozo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cerrar comanda/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reabrir comanda/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Anular comanda/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Facturar comanda/ })).not.toBeInTheDocument();
  });

  it('no consulta clientes ni mesas (evita el 403) y no muestra el panel de clientes', async () => {
    abrirEn();

    await screen.findByText('Comanda #3');
    expect(screen.queryByRole('heading', { name: 'Clientes' })).not.toBeInTheDocument();
    expect(api.listarClientes).not.toHaveBeenCalled();
    expect(api.listarMesas).not.toHaveBeenCalled();
  });
});

describe('Atención: el chef marca listo desde el detalle', () => {
  beforeEach(() => usarRoles(['CHEF']));

  it('abre el detalle con controles de listo y sin los botones de entrega', async () => {
    abrirEn();
    await screen.findByText('Comanda #3');

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de la comanda #3' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Detalle de la comanda #3' });
    expect(await within(dialogo).findByText('Milanesa')).toBeInTheDocument();
    expect(within(dialogo).getByText('1 de 2')).toBeInTheDocument();
    expect(
      within(dialogo).getByRole('button', { name: 'Marcar todo listo de Milanesa' }),
    ).toBeEnabled();
    expect(
      within(dialogo).queryByRole('button', { name: /Sumar|Restar|Entregar todo/ }),
    ).toBeNull();
    expect(api.registrarEntrega).not.toHaveBeenCalled();
    expect(api.listarMesas).not.toHaveBeenCalled();
  });

  it('marca una línea como lista desde el detalle', async () => {
    vi.mocked(api.marcarListo).mockResolvedValue({ exito: true, datos: ENTREGAS_LISTAS });
    abrirEn();
    await screen.findByText('Comanda #3');
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de la comanda #3' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Detalle de la comanda #3' });

    fireEvent.click(
      await within(dialogo).findByRole('button', { name: 'Marcar todo listo de Milanesa' }),
    );

    expect(api.marcarListo).toHaveBeenCalledWith(3, 1, 2);
    expect(await within(dialogo).findByText('Listas para servir: 1')).toBeInTheDocument();
    expect(within(dialogo).getByText('Listo para servir')).toBeInTheDocument();
  });

  it('?nueva=1 y ?mesa=7 no abren el alta de comanda', async () => {
    abrirEn('/atencion?nueva=1&mesa=7');

    await screen.findByText('Comanda #3');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.listarMesas).not.toHaveBeenCalled();
  });
});
