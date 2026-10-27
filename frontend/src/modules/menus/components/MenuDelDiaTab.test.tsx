import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  crearMenuDelDia,
  darDeBajaMenuDelDia,
  listarMenusDelDia,
  listarSeccionesHabilitadas,
} from '../api';
import type { MenuDelDiaListado } from '../types';

import { MenuDelDiaTab } from './MenuDelDiaTab';

vi.mock('../api');

const SECCIONES = {
  datos: { items: [{ id: 1, nombre: 'Principales' }], total: 1, limit: 100, offset: 0 },
  exito: true,
};

const MENU: MenuDelDiaListado = {
  id: 1,
  nombre: 'Guiso de lentejas',
  descripcion: 'Con pan',
  seccion: { id: 1, nombre: 'Principales' },
  precio: '9900.00',
  estado: 'HABILITADO',
  imagen_url: null,
};

function abrir() {
  render(<MenuDelDiaTab />);
}

function conMenus(menus: MenuDelDiaListado[] = [MENU]) {
  vi.mocked(listarSeccionesHabilitadas).mockResolvedValue(SECCIONES);
  vi.mocked(listarMenusDelDia).mockResolvedValue({
    datos: { items: menus, total: menus.length, limit: 10, offset: 0 },
    exito: true,
  });
}

async function completarFormulario(nombre = 'Guiso de lentejas') {
  fireEvent.change(await screen.findByLabelText(/Nombre/), { target: { value: nombre } });
  fireEvent.change(screen.getByLabelText(/Sección/), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText(/Precio/), { target: { value: '9900' } });
  fireEvent.change(screen.getByLabelText(/Ingredientes/), { target: { value: 'Lentejas' } });
  fireEvent.keyDown(screen.getByLabelText(/Ingredientes/), { key: 'Enter' });
}

async function darDeAlta(nombre?: string) {
  await completarFormulario(nombre);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar menú' }));
  await waitFor(() => expect(crearMenuDelDia).toHaveBeenCalled());
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('pestaña Menú del día', () => {
  it('lista los menús con su sección y su precio', async () => {
    conMenus();
    abrir();

    expect(await screen.findByText('Guiso de lentejas')).toBeInTheDocument();
    expect(screen.getByText('Con pan')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Principales')).toBeInTheDocument();
  });

  it('avisa cuando no hay secciones habilitadas', async () => {
    vi.mocked(listarSeccionesHabilitadas).mockResolvedValue({
      datos: { items: [], total: 0, limit: 100, offset: 0 },
      exito: true,
    });
    vi.mocked(listarMenusDelDia).mockResolvedValue({
      datos: { items: [], total: 0, limit: 10, offset: 0 },
      exito: true,
    });

    abrir();

    expect(await screen.findByText(/No hay secciones habilitadas/i)).toBeInTheDocument();
  });
});

describe('pestaña Menú del día: alta y baja', () => {
  it('no envía el alta si falta el nombre', async () => {
    conMenus();
    abrir();

    fireEvent.click(await screen.findByRole('button', { name: 'Guardar menú' }));

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(crearMenuDelDia).not.toHaveBeenCalled();
  });

  it('crea el menú y recarga la lista', async () => {
    conMenus();
    vi.mocked(crearMenuDelDia).mockResolvedValue({
      datos: { ...MENU, categoria: 'MENU_DEL_DIA', ingredientes: ['Lentejas'], etiquetas: [] },
      exito: true,
    });
    abrir();

    await darDeAlta();

    const [datos] = vi.mocked(crearMenuDelDia).mock.calls[0] ?? [];
    expect(datos).toMatchObject({
      nombre: 'Guiso de lentejas',
      seccion_id: 1,
      precio: '9900.00',
      ingredientes: ['Lentejas'],
    });
    await waitFor(() => expect(listarMenusDelDia).toHaveBeenCalledTimes(2));
  });

  it('muestra el choque de nombre bajo el campo', async () => {
    conMenus();
    vi.mocked(crearMenuDelDia).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El menú del día ya está registrado',
    });
    abrir();

    await darDeAlta('Guiso');

    expect(await screen.findByText('El menú del día ya está registrado')).toBeInTheDocument();
  });

  it('pide confirmación antes de dar de baja y no envía si se cancela', async () => {
    conMenus();
    abrir();

    fireEvent.click(await screen.findByRole('button', { name: /Dar de baja Guiso/ }));

    expect(darDeBajaMenuDelDia).not.toHaveBeenCalled();
  });

  it('no ofrece dar de baja un menú ya deshabilitado', async () => {
    conMenus([{ ...MENU, estado: 'DESHABILITADO' }]);
    abrir();

    expect(await screen.findByRole('button', { name: /Dar de baja Guiso/ })).toBeDisabled();
  });
});
