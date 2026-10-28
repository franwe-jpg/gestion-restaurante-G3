import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastProvider } from '../../../shared/components/ui/toast';

import {
  crearMenuDelDia,
  darDeBajaMenuDelDia,
  listarMenusDelDia,
  listarSeccionesHabilitadas,
  modificarMenuDelDia,
  obtenerMenuDelDia,
} from '../api';
import type { MenuDelDia, MenuDelDiaListado } from '../types';

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

const MENU_COMPLETO: MenuDelDia = {
  ...MENU,
  categoria: 'MENU_DEL_DIA',
  ingredientes: ['Lentejas'],
  etiquetas: ['Casero'],
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
    expect(listarMenusDelDia).toHaveBeenCalledWith('HABILITADO', 10, 0);
  });

  it('filtra los menús por estado y vuelve a la primera página', async () => {
    conMenus();
    abrir();

    fireEvent.change(await screen.findByLabelText('Filtrar menús por estado'), {
      target: { value: 'DESHABILITADO' },
    });

    await waitFor(() => expect(listarMenusDelDia).toHaveBeenLastCalledWith('DESHABILITADO', 10, 0));
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

describe('pestaña Menú del día: baja lógica', () => {
  it('la baja lógica deshabilita y lo quita del listado de habilitados', async () => {
    const confirmar = vi.fn().mockResolvedValue(true);
    vi.mocked(listarSeccionesHabilitadas).mockResolvedValue(SECCIONES);
    vi.mocked(listarMenusDelDia)
      .mockResolvedValueOnce({
        datos: { items: [MENU], total: 1, limit: 10, offset: 0 },
        exito: true,
      })
      .mockResolvedValue({ datos: { items: [], total: 0, limit: 10, offset: 0 }, exito: true });
    vi.mocked(darDeBajaMenuDelDia).mockResolvedValue({ datos: MENU_COMPLETO, exito: true });
    render(
      <ConfirmContext.Provider value={confirmar}>
        <MenuDelDiaTab />
      </ConfirmContext.Provider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Dar de baja Guiso/ }));

    await waitFor(() => expect(darDeBajaMenuDelDia).toHaveBeenCalledWith(MENU.id));
    expect(await screen.findByText('Sin menús del día')).toBeInTheDocument();
    expect(confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Dar de baja Guiso de lentejas' }),
    );
  });
});

describe('pestaña Menú del día: edición', () => {
  it('carga los datos del menú y lo modifica en el lugar', async () => {
    conMenus();
    vi.mocked(obtenerMenuDelDia).mockResolvedValue({ datos: MENU_COMPLETO, exito: true });
    vi.mocked(modificarMenuDelDia).mockResolvedValue({ datos: MENU_COMPLETO, exito: true });
    abrir();

    fireEvent.click(await screen.findByRole('button', { name: /Modificar Guiso/ }));

    await waitFor(() => expect(screen.getByLabelText(/Nombre/)).toHaveValue('Guiso de lentejas'));
    expect(screen.getByLabelText(/Sección/)).toHaveValue('1');
    expect(screen.getByLabelText(/Precio/)).toHaveValue('9900.00');

    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Guiso nuevo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(modificarMenuDelDia).toHaveBeenCalledTimes(1));
    expect(modificarMenuDelDia).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ nombre: 'Guiso nuevo' }),
      null,
    );
    await waitFor(() => expect(listarMenusDelDia).toHaveBeenCalledTimes(2));
  });

  it('avisa cuando no puede cargar el menú a editar', async () => {
    conMenus();
    vi.mocked(obtenerMenuDelDia).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });
    render(
      <ToastProvider>
        <MenuDelDiaTab />
      </ToastProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Modificar Guiso/ }));

    expect(await screen.findByText('No se pudo conectar con el backend')).toBeInTheDocument();
  });
});
