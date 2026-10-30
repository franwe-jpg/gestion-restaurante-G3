import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AppProviders } from './AppProviders';
import { ComponentesPage } from './ComponentesPage';

function renderizarPagina() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <ComponentesPage />
      </AppProviders>
    </MemoryRouter>,
  );
}

describe('ComponentesPage', () => {
  it('abre y cierra el panel lateral', () => {
    renderizarPagina();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir panel lateral' }));
    expect(screen.getByRole('dialog', { name: 'Panel de ejemplo' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abre y cierra el modal de confirmación', () => {
    renderizarPagina();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar mesa' }));
    expect(screen.getByRole('dialog', { name: 'Eliminar mesa' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cambia de página con el paginador', () => {
    renderizarPagina();

    expect(screen.getByText('Página 1 de 8')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(screen.getByText('Página 2 de 8')).toBeInTheDocument();
  });
});
