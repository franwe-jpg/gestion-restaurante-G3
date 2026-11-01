import { useState } from 'react';

interface EntregasAbiertas {
  id: number;
  volverACierre: boolean;
}

/** Intercambia el modal de cierre y el de entregas: nunca hay dos abiertos a la vez. */
export function useEntregasModal(abrirCierre: (id: number | null) => void) {
  const [entregas, setEntregas] = useState<EntregasAbiertas | null>(null);
  function irAEntregas(id: number, volverACierre: boolean) {
    abrirCierre(null);
    setEntregas({ id, volverACierre });
  }
  function salirDeEntregas() {
    if (entregas?.volverACierre) abrirCierre(entregas.id);
    setEntregas(null);
  }
  return { entregas, irAEntregas, salirDeEntregas };
}
