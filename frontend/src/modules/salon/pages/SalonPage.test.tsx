import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/components/ui/toast';
import { crearMesa, crearSector, listarSectoresHabilitados } from '../api';
import type { Mesa, Sector } from '../types';

import { SalonPage } from './SalonPage';

vi.mock('../api');

const SECTORES: Sector[] = [
  { id: 1, nombre: 'Salón principal', descripcion: null, estado: 'HABILITADO' },
];

const MESA_CREADA: Mesa = {
  id: 1,
  numero: 13,
  capacidad: 4,
  sector: { id: 1, nombre: 'Salón principal' },
  estado: 'LIBRE',
};

function sectores(items: Sector[]) {
  vi.mocked(listarSectoresHabilitados).mockResolvedValue({
    datos: { items, total: items.length, limit: 100, offset: 0 },
    exito: true,
  });
}

async function abrirMesa(sectoresHabilitados: Sector[] = SECTORES) {
  sectores(sectoresHabilitados);
  fireEvent.click(screen.getByRole('button', { name: 'Nueva mesa' }));
  await screen.findByLabelText(/Número/);
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('SalonPage', () => {
  it('muestra el encabezado, la acción de alta y el aviso de listados pendientes', () => {
    render(<SalonPage />);

    expect(screen.getByRole('heading', { name: 'Salón y Mozos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo sector' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva mesa' })).toBeInTheDocument();
    expect(screen.getByText(/HU-M3-04/)).toBeInTheDocument();
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
    render(
      <ToastProvider>
        <SalonPage />
      </ToastProvider>,
    );

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
    render(
      <ToastProvider>
        <SalonPage />
      </ToastProvider>,
    );
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
