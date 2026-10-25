import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listarProductosHabilitados, listarSecciones } from '../api';

import { ProductosPage } from './ProductosPage';

vi.mock('../api');

function abrir(ruta = '/productos') {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/productos" element={<ProductosPage />} />
        <Route path="/productos/platos/nuevo" element={<p>Formulario de plato</p>} />
        <Route path="/productos/postres/nuevo" element={<p>Formulario de postre</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function pestaniasVacias() {
  const vacia = { datos: { items: [], total: 0, limit: 50, offset: 0 }, exito: true };
  vi.mocked(listarSecciones).mockResolvedValue(vacia);
  vi.mocked(listarProductosHabilitados).mockResolvedValue(vacia);
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('ProductosPage', () => {
  it('muestra las pestañas Productos y Secciones, y abre Productos primero', () => {
    abrir();

    expect(screen.getByRole('tab', { name: 'Productos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Secciones' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByText('Módulo pendiente de implementación')).toBeInTheDocument();
  });

  it('carga las secciones al abrir la pestaña Secciones', async () => {
    pestaniasVacias();
    abrir();

    fireEvent.click(screen.getByRole('tab', { name: 'Secciones' }));

    expect(await screen.findByRole('button', { name: 'Nueva sección' })).toBeInTheDocument();
    expect(listarSecciones).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['Nuevo plato', 'Formulario de plato'],
    ['Nuevo postre', 'Formulario de postre'],
  ])('ofrece «%s» en la pestaña Productos y lleva al formulario (CA 1)', (boton, formulario) => {
    abrir();

    fireEvent.click(screen.getByRole('button', { name: boton }));

    expect(screen.getByText(formulario)).toBeInTheDocument();
  });

  it('abre la pestaña Secciones cuando la ruta trae ?pestania=secciones (CA 8)', async () => {
    pestaniasVacias();
    abrir('/productos?pestania=secciones');

    expect(screen.getByRole('tab', { name: 'Secciones' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('button', { name: 'Nueva sección' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo plato' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo postre' })).not.toBeInTheDocument();
  });

  it('ignora un valor desconocido de ?pestania= y abre Productos', () => {
    abrir('/productos?pestania=otra');

    expect(screen.getByRole('tab', { name: 'Productos' })).toHaveAttribute('aria-selected', 'true');
  });
});
