import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useAbrirDesdeUrl } from './useAbrirDesdeUrl';

function Pagina({ abrir }: { abrir: () => void }) {
  useAbrirDesdeUrl('nueva', abrir);
  const ubicacion = useLocation();
  return <p data-testid="url">{`${ubicacion.pathname}${ubicacion.search}`}</p>;
}

function renderizar(ruta: string, abrir: () => void) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Pagina abrir={abrir} />
    </MemoryRouter>,
  );
}

describe('useAbrirDesdeUrl', () => {
  it('con nueva=1 llama a abrir y deja la URL sin el parámetro', () => {
    const abrir = vi.fn();

    renderizar('/atencion?nueva=1', abrir);

    expect(abrir).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('url')).toHaveTextContent('/atencion');
    expect(screen.getByTestId('url').textContent).toBe('/atencion');
  });

  it.each(['/atencion?nueva=abc', '/atencion?nueva=0', '/atencion'])(
    'no hace nada con %s',
    (ruta) => {
      const abrir = vi.fn();

      renderizar(ruta, abrir);

      expect(abrir).not.toHaveBeenCalled();
      expect(screen.getByTestId('url').textContent).toBe(ruta);
    },
  );

  it('conserva los demás parámetros', () => {
    const abrir = vi.fn();

    renderizar('/atencion?nueva=1&mesa=5', abrir);

    expect(abrir).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('url').textContent).toBe('/atencion?mesa=5');
  });

  it('no vuelve a abrir al re-renderizar', () => {
    const abrir = vi.fn();
    const vista = renderizar('/atencion?nueva=1', abrir);

    vista.rerender(
      <MemoryRouter initialEntries={['/atencion?nueva=1']}>
        <Pagina abrir={abrir} />
      </MemoryRouter>,
    );

    expect(abrir).toHaveBeenCalledTimes(1);
  });
});
