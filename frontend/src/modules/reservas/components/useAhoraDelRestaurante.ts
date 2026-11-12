import { useEffect, useState } from 'react';

/** Cada cuánto se vuelve a leer el reloj: lo justo para que un botón se habilite al llegar la hora. */
export const INTERVALO_AHORA_MS = 60_000;

/**
 * Instante actual, refrescado cada minuto, para que lo que depende de la hora cambie sin recargar la
 * página (HU-M5-06). Devuelve el instante tal cual: pasarlo a la hora del restaurante (UTC-3) es
 * trabajo de `atencionDeReserva`. La limpieza del efecto detiene el temporizador al desmontar.
 */
export function useAhoraDelRestaurante(): Date {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const temporizador = setInterval(() => setAhora(new Date()), INTERVALO_AHORA_MS);
    return () => clearInterval(temporizador);
  }, []);

  return ahora;
}
