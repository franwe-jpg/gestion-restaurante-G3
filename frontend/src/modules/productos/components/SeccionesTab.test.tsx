import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import {
  crearSeccion,
  darDeBajaSeccion,
  listarProductosHabilitados,
  listarSecciones,
  modificarSeccion,
} from '../api';
import type { ProductoSeleccionable, SeccionListado } from '../types';

import { SeccionesTab } from './SeccionesTab';

vi.mock('../api');

const ENTRADAS: SeccionListado = {
  id: 1,
  nombre: 'Entradas',
  orden: 1,
  estado: 'HABILITADO',
  cantidad_productos: 2,
  productos_habilitados: 2,
};

function pagina<T>(items: T[]) {
  return { datos: { items, total: items.length, limit: 50, offset: 0 }, exito: true };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('SeccionesTab', () => {
  it('lista las secciones que devuelve la API', async () => {
    vi.mocked(listarSecciones).mockResolvedValue(pagina([ENTRADAS]));
    vi.mocked(listarProductosHabilitados).mockResolvedValue(pagina([]));

    render(<SeccionesTab />);

    expect(await screen.findByText('Entradas')).toBeInTheDocument();
    expect(listarSecciones).toHaveBeenCalledWith(50, 0);
  });

  it('muestra el error de carga con la opción de reintentar', async () => {
    vi.mocked(listarSecciones).mockResolvedValue({ datos: null, exito: false, error: 'Falló' });
    vi.mocked(listarProductosHabilitados).mockResolvedValue(pagina([]));

    render(<SeccionesTab />);

    expect(await screen.findByText('Falló')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('abre el diálogo y recarga el listado al crear una sección', async () => {
    vi.mocked(listarSecciones).mockResolvedValueOnce(pagina([]));
    vi.mocked(listarSecciones).mockResolvedValue(pagina([ENTRADAS]));
    vi.mocked(listarProductosHabilitados).mockResolvedValue(pagina([]));
    vi.mocked(crearSeccion).mockResolvedValue({
      datos: {
        id: 1,
        nombre: 'Entradas',
        orden: 1,
        estado: 'HABILITADO',
        productos: [],
        productos_habilitados: 0,
      },
      exito: true,
    });
    render(<SeccionesTab />);
    await screen.findByText('Todavía no hay secciones');

    fireEvent.click(screen.getByRole('button', { name: 'Nueva sección' }));
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Entradas' } });
    fireEvent.change(screen.getByLabelText(/Orden/), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Entradas')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('cierra el diálogo sin crear nada al cancelar', async () => {
    vi.mocked(listarSecciones).mockResolvedValue(pagina([ENTRADAS]));
    vi.mocked(listarProductosHabilitados).mockResolvedValue(pagina([]));
    render(<SeccionesTab />);
    await screen.findByText('Entradas');

    fireEvent.click(screen.getByRole('button', { name: 'Nueva sección' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(crearSeccion).not.toHaveBeenCalled();
  });
});

const FLAN: ProductoSeleccionable = {
  id: 4,
  nombre: 'Flan',
  categoria: 'POSTRE',
  seccion: { id: 1, nombre: 'Entradas' },
};

function montar() {
  const confirmar = vi.fn().mockResolvedValue(true);
  render(
    <ConfirmContext.Provider value={confirmar}>
      <SeccionesTab />
    </ConfirmContext.Provider>,
  );
}

describe('SeccionesTab: editar una fila', () => {
  it('«Editar» abre el diálogo con la fila y sus productos habilitados', async () => {
    vi.mocked(listarSecciones).mockResolvedValue(pagina([ENTRADAS]));
    vi.mocked(listarProductosHabilitados).mockResolvedValue(pagina([FLAN]));
    vi.mocked(modificarSeccion).mockResolvedValue({
      datos: { ...ENTRADAS, productos: [] },
      exito: true,
    });
    montar();
    await screen.findByText('Entradas');
    await vi.waitFor(() => expect(listarProductosHabilitados).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('button', { name: 'Editar «Entradas»' }));

    expect(screen.getByText('Editar sección')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Entradas');
    await waitFor(() =>
      expect(screen.getByLabelText('Flan (sección actual: Entradas)')).toBeChecked(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(modificarSeccion).toHaveBeenCalledWith(1, expect.objectContaining({ orden: 1 }));
  });
});

describe('SeccionesTab: dar de baja una fila', () => {
  it('tras dar de baja recarga solo las secciones y la fila sigue en la página', async () => {
    vi.mocked(listarSecciones).mockResolvedValueOnce(pagina([ENTRADAS]));
    vi.mocked(listarSecciones).mockResolvedValue(
      pagina([{ ...ENTRADAS, estado: 'DESHABILITADO' as const, productos_habilitados: 0 }]),
    );
    vi.mocked(listarProductosHabilitados).mockResolvedValue(pagina([]));
    vi.mocked(darDeBajaSeccion).mockResolvedValue({
      datos: { ...ENTRADAS, productos: [], estado: 'DESHABILITADO' },
      exito: true,
    });
    montar();

    fireEvent.click(await screen.findByRole('button', { name: 'Dar de baja «Entradas»' }));

    expect(await screen.findByText('Deshabilitada')).toBeInTheDocument();
    expect(screen.getByText('Entradas')).toBeInTheDocument();
    expect(darDeBajaSeccion).toHaveBeenCalledWith(1);
    expect(listarSecciones).toHaveBeenCalledTimes(2);
    expect(listarProductosHabilitados).toHaveBeenCalledTimes(1);
  });
});
