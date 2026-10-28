import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastProvider } from '../../../shared/components/ui/toast';
import {
  crearMesa,
  crearSector,
  eliminarSector,
  listarSectores,
  listarSectoresHabilitados,
  modificarSector,
} from '../api';
import type { Mesa, Sector } from '../types';

import { SalonPage } from './SalonPage';

vi.mock('../api');

const SALON: Sector = {
  id: 1,
  nombre: 'Salón principal',
  descripcion: 'Planta baja',
  estado: 'HABILITADO',
};

const TERRAZA: Sector = {
  id: 2,
  nombre: 'Terraza',
  descripcion: 'Al aire libre',
  estado: 'HABILITADO',
};

const RESERVADO: Sector = {
  id: 3,
  nombre: 'Reservado',
  descripcion: null,
  estado: 'DESHABILITADO',
};

const MESA_CREADA: Mesa = {
  id: 1,
  numero: 13,
  capacidad: 4,
  sector: { id: 1, nombre: 'Salón principal' },
  estado: 'LIBRE',
};

function listado(items: Sector[], total = items.length) {
  return { datos: { items, total, limit: 50, offset: 0 }, exito: true };
}

function renderConToasts() {
  return render(
    <ToastProvider>
      <SalonPage />
    </ToastProvider>,
  );
}

function renderConConfirmacion(aceptado = true) {
  const confirmar = vi.fn().mockResolvedValue(aceptado);
  render(
    <ToastProvider>
      <ConfirmContext.Provider value={confirmar}>
        <SalonPage />
      </ConfirmContext.Provider>
    </ToastProvider>,
  );
  return confirmar;
}

async function abrirMesa(sectoresHabilitados: Sector[] = [SALON]) {
  vi.mocked(listarSectoresHabilitados).mockResolvedValue({
    datos: { items: sectoresHabilitados, total: sectoresHabilitados.length, limit: 100, offset: 0 },
    exito: true,
  });
  fireEvent.click(screen.getByRole('button', { name: 'Nueva mesa' }));
  await screen.findByLabelText(/Número/);
}

async function abrirEdicion(nombre = 'Terraza') {
  render(<SalonPage />);
  fireEvent.click(await screen.findByRole('button', { name: `Editar «${nombre}»` }));
  return screen.findByRole('heading', { name: 'Editar sector' });
}

function prepararGuardadoExitoso() {
  const modificado = { ...TERRAZA, nombre: 'Salón central', descripcion: 'Planta alta' };
  vi.mocked(listarSectores)
    .mockResolvedValueOnce(listado([TERRAZA]))
    .mockResolvedValue(listado([modificado]));
  vi.mocked(modificarSector).mockResolvedValue({ datos: modificado, exito: true });
}

beforeEach(() => {
  vi.mocked(listarSectores).mockResolvedValue(listado([]));
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('SalonPage: listado de sectores', () => {
  it('muestra la tabla con los datos de los sectores (CA 1 de #36)', async () => {
    vi.mocked(listarSectores).mockResolvedValue(listado([SALON, TERRAZA, RESERVADO]));

    render(<SalonPage />);

    expect(await screen.findByText('Salón principal')).toBeInTheDocument();
    expect(screen.getByText('Terraza')).toBeInTheDocument();
    expect(screen.getByText('Planta baja')).toBeInTheDocument();
    expect(screen.getByText('Al aire libre')).toBeInTheDocument();
    expect(screen.getByText('Reservado')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Deshabilitado')).toBeInTheDocument();
  });

  it('sin sectores informa «No hay sectores disponibles» (CA 2 de #36)', async () => {
    render(<SalonPage />);

    expect(await screen.findByText('No hay sectores disponibles')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar «/ })).toBeNull();
  });

  it('muestra los sectores ordenados por nombre (CA 3 de #36)', async () => {
    vi.mocked(listarSectores).mockResolvedValue(listado([RESERVADO, SALON, TERRAZA]));

    render(<SalonPage />);
    await screen.findByText('Reservado');

    const filas = screen.getAllByRole('row').slice(1);
    const nombres = filas.map((fila) => within(fila).getAllByRole('cell')[0]?.textContent);

    expect(nombres).toEqual(['Reservado', 'Salón principal', 'Terraza']);
  });

  it('muestra el error de carga y permite reintentar', async () => {
    vi.mocked(listarSectores).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });

    render(<SalonPage />);

    expect(await screen.findByText('No se pudo conectar con el backend')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(listarSectores).toHaveBeenCalledTimes(2));
  });
});

describe('SalonPage: paginación', () => {
  it('muestra los controles y pide la página siguiente con offset 50 (escenario Paginación)', async () => {
    vi.mocked(listarSectores).mockResolvedValue({
      datos: { items: [SALON], total: 120, limit: 50, offset: 0 },
      exito: true,
    });

    render(<SalonPage />);
    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));

    await waitFor(() => expect(listarSectores).toHaveBeenCalledWith(50, 50));
  });
});

describe('SalonPage: edición de sector', () => {
  it('abre el diálogo precargado desde la fila (escenario Editar desde la fila)', async () => {
    vi.mocked(listarSectores).mockResolvedValue(listado([TERRAZA]));

    await abrirEdicion();

    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Terraza');
    expect(screen.getByLabelText(/Descripción/)).toHaveValue('Al aire libre');
    expect(modificarSector).not.toHaveBeenCalled();
  });

  it('guarda la modificación, cierra el diálogo y recarga la tabla (CA 1 de #34)', async () => {
    prepararGuardadoExitoso();
    renderConToasts();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar «Terraza»' }));
    await screen.findByRole('heading', { name: 'Editar sector' });
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Salón central' } });
    fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: 'Planta alta' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Sector modificado')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(modificarSector).toHaveBeenCalledWith(2, {
      nombre: 'Salón central',
      descripcion: 'Planta alta',
    });
    expect(await screen.findByText('Salón central')).toBeInTheDocument();
    expect(listarSectores).toHaveBeenCalledTimes(2);
  });
});

describe('SalonPage: edición de sector: validaciones', () => {
  it('con el nombre vacío no guarda y la fila conserva el nombre (CA 2 de #34)', async () => {
    vi.mocked(listarSectores).mockResolvedValue(listado([TERRAZA]));

    await abrirEdicion();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(modificarSector).not.toHaveBeenCalled();
    expect(screen.getByText('Terraza')).toBeInTheDocument();
  });

  it('con el nombre de otro sector muestra el 409 bajo Nombre (CA 3 de #34)', async () => {
    vi.mocked(listarSectores).mockResolvedValue(listado([SALON, TERRAZA]));
    vi.mocked(modificarSector).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El sector ya existe',
    });

    await abrirEdicion();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Salón principal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Ya existe un sector con ese nombre.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Salón principal');
    expect(modificarSector).toHaveBeenCalledWith(2, {
      nombre: 'Salón principal',
      descripcion: 'Al aire libre',
    });
    expect(screen.getByRole('heading', { name: 'Editar sector' })).toBeInTheDocument();
  });

  it('al cancelar no envía nada y la fila mantiene sus datos (CA 4 de #34)', async () => {
    vi.mocked(listarSectores).mockResolvedValue(listado([TERRAZA]));

    await abrirEdicion();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Terraza norte' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(modificarSector).not.toHaveBeenCalled();
    expect(screen.getByText('Terraza')).toBeInTheDocument();
    expect(listarSectores).toHaveBeenCalledTimes(1);
  });
});

describe('SalonPage: alta de sector', () => {
  it('muestra el encabezado, la acción de alta y el listado vacío', async () => {
    render(<SalonPage />);

    expect(screen.getByRole('heading', { name: 'Salón y Mozos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo sector' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva mesa' })).toBeInTheDocument();
    expect(await screen.findByText('No hay sectores disponibles')).toBeInTheDocument();
  });

  it('abre el diálogo de alta y lo cierra sin crear nada al cancelar (CA 4)', () => {
    render(<SalonPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo sector' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nuevo sector' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(crearSector).not.toHaveBeenCalled();
  });

  it('cierra el diálogo y avisa cuando el sector se crea (CA 1)', async () => {
    vi.mocked(crearSector).mockResolvedValue({
      datos: { id: 1, nombre: 'Terraza', descripcion: null, estado: 'HABILITADO' },
      exito: true,
    });
    renderConToasts();

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo sector' }));
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Terraza' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Sector creado')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('SalonPage: alta de mesa', () => {
  it('abre el diálogo de mesa sin abrir el de sector (CA 1)', async () => {
    render(<SalonPage />);

    await abrirMesa();

    expect(screen.getByRole('heading', { name: 'Nueva mesa' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nuevo sector' })).toBeNull();
  });

  it('al cancelar el alta de mesa cierra sin crear nada (CA 4)', async () => {
    render(<SalonPage />);
    await abrirMesa();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(crearMesa).not.toHaveBeenCalled();
  });

  it('cierra el diálogo y avisa cuando la mesa se crea (CA 1)', async () => {
    vi.mocked(crearMesa).mockResolvedValue({ datos: MESA_CREADA, exito: true });
    renderConToasts();
    await abrirMesa();

    fireEvent.change(screen.getByLabelText(/Número/), { target: { value: '13' } });
    fireEvent.change(screen.getByLabelText(/Capacidad/), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/Sector/), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar mesa' }));

    expect(await screen.findByText('Mesa creada')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('desde el aviso sin sectores, «Crear sector» cierra mesa y abre el de sector', async () => {
    render(<SalonPage />);
    await abrirMesa([]);

    expect(screen.getByText('Primero creá un sector')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear sector' }));

    expect(screen.getByRole('heading', { name: 'Nuevo sector' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nueva mesa' })).toBeNull();
  });
});

describe('SalonPage: baja de sector', () => {
  it('elimina el sector con confirmación y recarga el listado (CA 1 de #35)', async () => {
    vi.mocked(listarSectores)
      .mockResolvedValueOnce(listado([TERRAZA]))
      .mockResolvedValue(listado([{ ...TERRAZA, estado: 'DESHABILITADO' }]));
    vi.mocked(eliminarSector).mockResolvedValue({
      datos: { ...TERRAZA, estado: 'DESHABILITADO' },
      exito: true,
    });
    const confirmar = renderConConfirmacion();

    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar «Terraza»' }));

    await waitFor(() => expect(eliminarSector).toHaveBeenCalledWith(2));
    expect(confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: '¿Eliminar el sector «Terraza»?', variante: 'danger' }),
    );
    expect(await screen.findByText('Sector eliminado')).toBeInTheDocument();
    expect(await screen.findByText('Deshabilitado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar «Terraza»' })).toBeNull();
    expect(listarSectores).toHaveBeenCalledTimes(2);
  });

  it('con mesas asociadas muestra el mensaje del backend y conserva la fila (CA 2 de #35)', async () => {
    const mensaje = 'No se puede eliminar el sector Terraza porque tiene mesas asociadas';
    vi.mocked(listarSectores).mockResolvedValue(listado([TERRAZA]));
    vi.mocked(eliminarSector).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    renderConConfirmacion();

    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar «Terraza»' }));

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(screen.getByText('Habilitado')).toBeInTheDocument();
    expect(listarSectores).toHaveBeenCalledTimes(1);
  });

  it('al cancelar la confirmación no envía la baja', async () => {
    vi.mocked(listarSectores).mockResolvedValue(listado([TERRAZA]));
    renderConConfirmacion(false);

    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar «Terraza»' }));

    await waitFor(() => expect(eliminarSector).not.toHaveBeenCalled());
    expect(listarSectores).toHaveBeenCalledTimes(1);
  });
});
