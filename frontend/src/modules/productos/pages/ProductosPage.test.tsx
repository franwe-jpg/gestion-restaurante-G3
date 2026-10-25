import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listarProductosHabilitados, listarSecciones } from '../api';

import { ProductosPage } from './ProductosPage';

vi.mock('../api');

afterEach(() => {
  vi.resetAllMocks();
});

describe('ProductosPage', () => {
  it('muestra las pestañas Productos y Secciones, y abre Productos primero', () => {
    render(<ProductosPage />);

    expect(screen.getByRole('tab', { name: 'Productos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Secciones' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByText('Módulo pendiente de implementación')).toBeInTheDocument();
  });

  it('carga las secciones al abrir la pestaña Secciones', async () => {
    const vacia = { datos: { items: [], total: 0, limit: 50, offset: 0 }, exito: true };
    vi.mocked(listarSecciones).mockResolvedValue(vacia);
    vi.mocked(listarProductosHabilitados).mockResolvedValue(vacia);
    render(<ProductosPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'Secciones' }));

    expect(await screen.findByRole('button', { name: 'Nueva sección' })).toBeInTheDocument();
    expect(listarSecciones).toHaveBeenCalledTimes(1);
  });
});
