import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import App from '../../App';

function renderizarRuta(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  );
}

describe('páginas de error', () => {
  it('muestra la página 403', () => {
    renderizarRuta('/403');

    expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument();
    expect(screen.getByText('403')).toBeInTheDocument();
  });

  it('muestra la página 500', () => {
    renderizarRuta('/500');

    expect(screen.getByRole('heading', { name: 'Error interno del servidor' })).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('muestra la página 503', () => {
    renderizarRuta('/503');

    expect(screen.getByRole('heading', { name: 'Servicio no disponible' })).toBeInTheDocument();
    expect(screen.getByText('503')).toBeInTheDocument();
  });

  it('muestra la página 404 en rutas desconocidas', () => {
    renderizarRuta('/ruta-inexistente');

    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
  });
});
