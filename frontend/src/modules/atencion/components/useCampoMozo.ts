import { useState } from 'react';

import type { MozoSeleccionable } from '../types';
import type { CampoMozoProps } from './CampoMozo';
import { etiquetaMozo } from './catalogoComanda';
import { useMozosHabilitados } from './useCatalogoComanda';

/** Estado del buscador de mozos habilitados; `textoInicial` muestra el mozo preseleccionado. */
export function useCampoMozo(
  mozoId: string,
  setMozoId: (mozoId: string) => void,
  textoInicial = '',
): CampoMozoProps {
  const [texto, setTexto] = useState(textoInicial);
  const [busqueda, setBusqueda] = useState('');
  const catalogo = useMozosHabilitados(busqueda);
  function cambiarTexto(nuevo: string) {
    setTexto(nuevo);
    setBusqueda(nuevo);
    setMozoId('');
  }
  function seleccionar(mozo: MozoSeleccionable) {
    setTexto(etiquetaMozo(mozo));
    setMozoId(String(mozo.id));
  }
  return {
    mozoId,
    texto,
    mozos: catalogo.mozos,
    cargando: catalogo.cargando,
    error: catalogo.error,
    onTexto: cambiarTexto,
    onSeleccionar: seleccionar,
    onReintentar: catalogo.recargar,
  };
}
