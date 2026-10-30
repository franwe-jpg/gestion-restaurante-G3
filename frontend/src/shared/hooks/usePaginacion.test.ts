import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePaginacion } from './usePaginacion';

describe('usePaginacion', () => {
  it('calcula las páginas y limita los extremos', () => {
    const { result } = renderHook(() =>
      usePaginacion({ total: 100, limite: 10, paginaInicial: 1 }),
    );

    expect(result.current.pagina).toBe(1);
    expect(result.current.totalPaginas).toBe(10);
    expect(result.current.offset).toBe(0);

    act(() => result.current.siguiente());
    expect(result.current.pagina).toBe(2);
    expect(result.current.offset).toBe(10);

    act(() => result.current.irAPagina(99));
    expect(result.current.pagina).toBe(10);

    act(() => result.current.anterior());
    expect(result.current.pagina).toBe(9);
  });
});
