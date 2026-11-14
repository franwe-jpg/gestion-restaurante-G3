import { afterEach, describe, expect, it } from 'vitest';

import { aplicarTema, temaActual, temaInicial } from './tema';

const CLAVE = 'gestion-restaurante.tema';

afterEach(() => {
  document.documentElement.classList.remove('dark');
  localStorage.clear();
});

describe('tema', () => {
  it('aplica y recuerda el modo oscuro', () => {
    aplicarTema('oscuro');

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem(CLAVE)).toBe('oscuro');
    expect(temaActual()).toBe('oscuro');
  });

  it('vuelve al modo claro y lo recuerda', () => {
    aplicarTema('oscuro');
    aplicarTema('claro');

    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem(CLAVE)).toBe('claro');
    expect(temaActual()).toBe('claro');
  });

  it('lee la preferencia guardada', () => {
    localStorage.setItem(CLAVE, 'oscuro');

    expect(temaInicial()).toBe('oscuro');
  });
});
