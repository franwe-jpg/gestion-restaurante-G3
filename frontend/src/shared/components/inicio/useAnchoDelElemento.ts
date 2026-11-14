import { useLayoutEffect, useRef, useState } from 'react';

/** Ancho en px del elemento, actualizado con `ResizeObserver`; 0 si el navegador no lo ofrece. */
export function useAnchoDelElemento<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);

  useLayoutEffect(() => {
    const elemento = ref.current;
    if (elemento === null || typeof ResizeObserver === 'undefined') return undefined;
    const observador = new ResizeObserver(([entrada]) => {
      if (entrada !== undefined) setAncho(Math.round(entrada.contentRect.width));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return { ref, ancho };
}
