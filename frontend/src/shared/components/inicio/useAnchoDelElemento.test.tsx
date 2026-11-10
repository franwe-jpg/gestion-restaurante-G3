import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAnchoDelElemento } from './useAnchoDelElemento';

function Medido() {
  const { ref, ancho } = useAnchoDelElemento<HTMLDivElement>();
  return <div ref={ref}>ancho {ancho}</div>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useAnchoDelElemento', () => {
  it('sin ResizeObserver devuelve 0 (el plano usa su ancho por defecto)', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    render(<Medido />);

    expect(screen.getByText('ancho 0')).toBeInTheDocument();
  });

  it('sigue el ancho que informa el ResizeObserver y lo desconecta al desmontar', () => {
    let avisar: ResizeObserverCallback = () => undefined;
    const desconectar = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          avisar = callback;
        }
        observe() {}
        disconnect = desconectar;
      },
    );

    const { unmount } = render(<Medido />);
    act(() => {
      avisar([{ contentRect: { width: 311.6 } } as ResizeObserverEntry], {} as ResizeObserver);
    });

    expect(screen.getByText('ancho 312')).toBeInTheDocument();
    unmount();
    expect(desconectar).toHaveBeenCalled();
  });
});
