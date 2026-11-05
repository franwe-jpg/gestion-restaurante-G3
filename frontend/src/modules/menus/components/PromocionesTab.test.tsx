import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '../../../shared/components/ui/confirm-dialog';

import {
  crearPromocion,
  finalizarPromocion,
  listarProductosParaPromocion,
  listarPromociones,
  modificarPromocion,
} from '../api';
import type { Promocion } from '../types';

import { PromocionesTab } from './PromocionesTab';

vi.mock('../api');

const PROMOCION: Promocion = {
  id: 1,
  nombre: 'Happy hour',
  tipo: 'PORCENTAJE',
  descripcion: null,
  fecha_desde: '2026-11-01',
  fecha_hasta: '2026-11-30',
  dias_semana: ['LUNES', 'MARTES'],
  hora_desde: '17:00',
  hora_hasta: '20:30',
  descuento_porcentaje: 15,
  precio_fijo: null,
  cant_lleva: null,
  cant_paga: null,
  estado: 'HABILITADO',
  fecha_hora_finalizacion: null,
  productos: [{ id: 1, nombre: 'Milanesa', categoria: 'PLATO', estado: 'HABILITADO' }],
};

const PRODUCTO = {
  id: 1,
  nombre: 'Milanesa',
  categoria: 'PLATO' as const,
  estado: 'HABILITADO' as const,
  seccion: { id: 1, nombre: 'Principal' },
};

beforeEach(() => {
  vi.mocked(listarPromociones).mockResolvedValue({
    datos: { items: [PROMOCION], total: 1, limit: 10, offset: 0 },
    exito: true,
  });
  vi.mocked(listarProductosParaPromocion).mockResolvedValue({
    datos: [PRODUCTO],
    exito: true,
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

async function abrirAlta() {
  render(
    <ConfirmProvider>
      <PromocionesTab />
    </ConfirmProvider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Nueva promoción' }));
  return screen.findByRole('dialog', { name: 'Nueva promoción' });
}

async function completarFormulario(nombre = 'Happy hour') {
  fireEvent.change(await screen.findByLabelText(/Nombre/), { target: { value: nombre } });
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Incluir Milanesa' }));
  fireEvent.change(screen.getByLabelText(/Vigente desde/), { target: { value: '2026-11-01' } });
  fireEvent.change(screen.getByLabelText(/Vigente hasta/), { target: { value: '2026-11-30' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Lunes' }));
  fireEvent.change(screen.getByLabelText(/Descuento/), { target: { value: '15' } });
}

describe('pestaña Promociones: listado', () => {
  it('lista las promociones con su vigencia, días, horario y estado', async () => {
    render(
      <ConfirmProvider>
        <PromocionesTab />
      </ConfirmProvider>,
    );

    expect(await screen.findByText('Happy hour')).toBeInTheDocument();
    expect(screen.getByText('Porcentaje')).toBeInTheDocument();
    expect(screen.getByText('01/11/2026 – 30/11/2026')).toBeInTheDocument();
    expect(screen.getByText('Lun, Mar')).toBeInTheDocument();
    expect(screen.getByText('17:00 – 20:30')).toBeInTheDocument();
    expect(screen.getByText('Habilitada')).toBeInTheDocument();
    expect(listarPromociones).toHaveBeenCalledWith('TODOS', 10, 0);
  });
});

describe('pestaña Promociones: campos por tipo', () => {
  it('muestra solo el campo del tipo elegido y limpia los demás', async () => {
    const dialogo = await abrirAlta();

    expect(within(dialogo).getByLabelText(/Descuento/)).toBeInTheDocument();
    expect(within(dialogo).queryByLabelText(/Precio fijo/)).not.toBeInTheDocument();
    expect(within(dialogo).queryByLabelText(/Lleva/)).not.toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText(/Tipo de promoción/), {
      target: { value: 'PRECIO_FIJO' },
    });

    expect(within(dialogo).queryByLabelText(/Descuento/)).not.toBeInTheDocument();
    expect(within(dialogo).getByLabelText(/Precio fijo/)).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText(/Tipo de promoción/), {
      target: { value: 'NXM' },
    });

    expect(within(dialogo).queryByLabelText(/Precio fijo/)).not.toBeInTheDocument();
    expect(within(dialogo).getByLabelText(/Lleva/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText(/Paga/)).toBeInTheDocument();
  });
});

describe('pestaña Promociones: validación', () => {
  it('no envía el alta si faltan datos obligatorios', async () => {
    const dialogo = await abrirAlta();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar promoción' }));

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('Elegí al menos un producto.')).toBeInTheDocument();
    expect(screen.getByText('Elegí al menos un día.')).toBeInTheDocument();
    expect(crearPromocion).not.toHaveBeenCalled();
  });
});

describe('pestaña Promociones: envío', () => {
  it('crea la promoción, cierra el modal y recarga el listado', async () => {
    vi.mocked(crearPromocion).mockResolvedValue({ datos: PROMOCION, exito: true });
    await abrirAlta();

    await completarFormulario();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar promoción' }));

    await waitFor(() => expect(crearPromocion).toHaveBeenCalled());
    expect(vi.mocked(crearPromocion).mock.calls[0]?.[0]).toMatchObject({
      nombre: 'Happy hour',
      tipo: 'PORCENTAJE',
      producto_ids: [1],
      fecha_desde: '2026-11-01',
      fecha_hasta: '2026-11-30',
      dias_semana: ['LUNES'],
      descuento_porcentaje: 15,
      precio_fijo: null,
      cant_lleva: null,
      cant_paga: null,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(listarPromociones).toHaveBeenCalledTimes(2));
  });

  it('muestra el choque de nombre bajo el campo y no cierra el modal', async () => {
    vi.mocked(crearPromocion).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El nombre de la promoción ya existe',
    });
    await abrirAlta();

    await completarFormulario('Happy hour');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar promoción' }));

    expect(await screen.findByText('Ya existe una promoción con ese nombre.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Nueva promoción' })).toBeInTheDocument();
  });
});

describe('pestaña Promociones: edición', () => {
  it('abre la edición con los datos cargados y guarda los cambios', async () => {
    vi.mocked(modificarPromocion).mockResolvedValue({
      datos: { ...PROMOCION, nombre: 'Happy hour actualizada' },
      exito: true,
    });
    render(
      <ConfirmProvider>
        <PromocionesTab />
      </ConfirmProvider>,
    );
    await screen.findByText('Happy hour');

    fireEvent.click(screen.getByRole('button', { name: 'Editar «Happy hour»' }));

    const dialogo = screen.getByRole('dialog', { name: 'Editar promoción' });
    expect(within(dialogo).getByLabelText(/Nombre/)).toHaveValue('Happy hour');
    fireEvent.change(within(dialogo).getByLabelText(/Nombre/), {
      target: { value: 'Happy hour actualizada' },
    });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(modificarPromocion).toHaveBeenCalled());
    expect(vi.mocked(modificarPromocion).mock.calls[0]?.[0]).toBe(1);
    expect(vi.mocked(modificarPromocion).mock.calls[0]?.[1]).toMatchObject({
      nombre: 'Happy hour actualizada',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(listarPromociones).toHaveBeenCalledTimes(2));
  });

  it('muestra el bloqueo cuando la promoción ya fue aplicada', async () => {
    vi.mocked(modificarPromocion).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La promoción ya fue aplicada en una comanda; finalizala y creá una nueva',
    });
    render(
      <ConfirmProvider>
        <PromocionesTab />
      </ConfirmProvider>,
    );
    await screen.findByText('Happy hour');

    fireEvent.click(screen.getByRole('button', { name: 'Editar «Happy hour»' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText(
        'La promoción ya fue aplicada en una comanda; finalizala y creá una nueva',
      ),
    ).toBeInTheDocument();
  });
});

describe('pestaña Promociones: finalización', () => {
  it('pide confirmación, finaliza y recarga el listado', async () => {
    vi.mocked(finalizarPromocion).mockResolvedValue({
      datos: {
        ...PROMOCION,
        estado: 'DESHABILITADO',
        fecha_hora_finalizacion: '2026-11-05T02:00:00Z',
      },
      exito: true,
    });
    render(
      <ConfirmProvider>
        <PromocionesTab />
      </ConfirmProvider>,
    );
    await screen.findByText('Happy hour');

    fireEvent.click(screen.getByRole('button', { name: 'Finalizar «Happy hour»' }));

    const confirmacion = await screen.findByRole('dialog', {
      name: '¿Finalizar «Happy hour»?',
    });
    fireEvent.click(within(confirmacion).getByRole('button', { name: 'Finalizar' }));

    await waitFor(() => expect(finalizarPromocion).toHaveBeenCalledWith(1));
    await waitFor(() => expect(listarPromociones).toHaveBeenCalledTimes(2));
  });

  it('no ofrece finalizar una promoción ya deshabilitada', async () => {
    vi.mocked(listarPromociones).mockResolvedValue({
      datos: {
        items: [{ ...PROMOCION, estado: 'DESHABILITADO' }],
        total: 1,
        limit: 10,
        offset: 0,
      },
      exito: true,
    });
    render(
      <ConfirmProvider>
        <PromocionesTab />
      </ConfirmProvider>,
    );
    await screen.findByText('Happy hour');

    expect(
      screen.queryByRole('button', { name: 'Finalizar «Happy hour»' }),
    ).not.toBeInTheDocument();
  });
});
