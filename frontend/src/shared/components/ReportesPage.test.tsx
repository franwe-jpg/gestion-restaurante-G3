import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Sidebar } from './layout/Sidebar';
import { ReportesPage } from './ReportesPage';
import { REPORTES } from './reportes';
import textoPagina from './ReportesPage.tsx?raw';
import textoCatalogo from './reportes.ts?raw';

function renderizar(inicial = '/reportes') {
  return render(
    <MemoryRouter initialEntries={[inicial]}>
      <Routes>
        <Route path="/reportes" element={<ReportesPage />} />
        <Route path="/reportes/productos-mas-vendidos" element={<p>Pantalla M1</p>} />
        <Route path="/reportes/reservas-ausentismo" element={<p>Pantalla M5</p>} />
        <Route path="/reportes/recaudacion-por-medio-de-pago" element={<p>Pantalla M6</p>} />
        <Route path="/reportes/comandas-ticket-promedio" element={<p>Pantalla M4</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReportesPage', () => {
  it('muestra la tarjeta de productos mas vendidos con su descripcion', () => {
    renderizar();

    expect(screen.getByRole('heading', { name: 'Productos más vendidos' })).toBeInTheDocument();
    expect(screen.getByText(REPORTES[0]?.descripcion ?? '')).toBeInTheDocument();
    expect(
      within(screen.getAllByRole('listitem')[0]!).getByRole('link', { name: 'Generar' }),
    ).toBeInTheDocument();
  });

  it('Generar navega a la pantalla del reporte', () => {
    renderizar();

    fireEvent.click(
      within(screen.getAllByRole('listitem')[0]!).getByRole('link', { name: 'Generar' }),
    );

    expect(screen.getByText('Pantalla M1')).toBeInTheDocument();
  });

  it('muestra la tarjeta de reservas y ausentismo y Generar navega a su pantalla', () => {
    renderizar();

    const tarjeta = screen.getAllByRole('listitem')[1]!;
    expect(within(tarjeta).getByText('Reservas y ausentismo')).toBeInTheDocument();

    fireEvent.click(within(tarjeta).getByRole('link', { name: 'Generar' }));

    expect(screen.getByText('Pantalla M5')).toBeInTheDocument();
  });

  it('muestra la tarjeta de recaudación por medio de pago y Generar navega a su pantalla', () => {
    renderizar();

    const tarjeta = screen.getAllByRole('listitem')[4]!;
    expect(within(tarjeta).getByText('Recaudación por medio de pago')).toBeInTheDocument();

    fireEvent.click(within(tarjeta).getByRole('link', { name: 'Generar' }));

    expect(screen.getByText('Pantalla M6')).toBeInTheDocument();
  });

  it('muestra la tarjeta del reporte de comandas y navega a su pantalla', () => {
    renderizar();
    const tarjeta = screen.getAllByRole('listitem')[5]!;
    expect(
      within(tarjeta).getByText('Comandas y ticket promedio por día/turno'),
    ).toBeInTheDocument();
    fireEvent.click(within(tarjeta).getByRole('link', { name: 'Generar' }));

    expect(screen.getByText('Pantalla M4')).toBeInTheDocument();
  });

  it('muestra las tarjetas en una fila', () => {
    renderizar();

    const lista = screen.getByRole('list', { name: 'Reportes disponibles' });
    expect(lista.className).toMatch(/grid-cols|flex-row/);
  });

  it('el menu lateral tiene el item Reportes hacia /reportes', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Reportes/ })).toHaveAttribute('href', '/reportes');
  });
});

describe('independencia de los modulos', () => {
  it.each([
    ['ReportesPage.tsx', textoPagina],
    ['reportes.ts', textoCatalogo],
  ])('%s no importa de modules', (_archivo, texto) => {
    expect(texto).not.toMatch(/from\s+['"][^'"]*modules\//);
  });
});
