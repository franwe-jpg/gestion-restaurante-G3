import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/components/ui/toast';
import { crearSector } from '../api';

import { SalonPage } from './SalonPage';

vi.mock('../api');

afterEach(() => {
  vi.resetAllMocks();
});

describe('SalonPage', () => {
  it('muestra el encabezado, la acción de alta y el aviso de listados pendientes', () => {
    render(<SalonPage />);

    expect(screen.getByRole('heading', { name: 'Salón y Mozos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo sector' })).toBeInTheDocument();
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
