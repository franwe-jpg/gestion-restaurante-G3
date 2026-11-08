import { useState } from 'react';

import { useApi } from '../../../shared/hooks/useApi';
import { useToast } from '../../../shared/hooks/useToast';
import { guardarArchivo } from '../../../shared/lib/guardarArchivo';
import { descargarComprobantePdf, obtenerComprobante, obtenerFactura } from '../api';
import type { Comprobante, FacturaResumen } from '../types';

interface EstadoComprobante {
  comprobante: Comprobante | null;
  cargando: boolean;
  error: string | null;
}

const SIN_COMPROBANTE: EstadoComprobante = { comprobante: null, cargando: false, error: null };

/** HU-M6-03: cobros de una factura, el comprobante elegido y su descarga en PDF. */
export function useComprobantesDeFactura(factura: FacturaResumen) {
  const { mostrarToast } = useToast();
  const consulta = useApi(() => obtenerFactura(factura.id), `factura-comprobantes-${factura.id}`);
  const [estado, setEstado] = useState<EstadoComprobante>(SIN_COMPROBANTE);
  const [descargando, setDescargando] = useState(false);

  const ver = async (numero: number) => {
    setEstado({ comprobante: null, cargando: true, error: null });
    const respuesta = await obtenerComprobante(numero);
    setEstado({
      comprobante: respuesta.exito ? respuesta.datos : null,
      cargando: false,
      error: respuesta.exito ? null : (respuesta.error ?? 'No se pudo obtener el comprobante'),
    });
  };

  const descargar = async () => {
    const numero = estado.comprobante?.numero_comprobante;
    if (numero === undefined || descargando) return;
    setDescargando(true);
    const respuesta = await descargarComprobantePdf(numero);
    setDescargando(false);
    if (!respuesta.exito || respuesta.datos === null) {
      const descripcion = respuesta.error ?? 'No se pudo descargar el comprobante';
      mostrarToast({ titulo: 'Error al descargar', descripcion, variante: 'danger' });
      return;
    }
    guardarArchivo(respuesta.datos, `comprobante-${numero}.pdf`);
  };

  return {
    factura: consulta.datos,
    cargandoFactura: consulta.cargando,
    errorFactura: consulta.error,
    ...estado,
    descargando,
    ver,
    volver: () => setEstado(SIN_COMPROBANTE),
    descargar,
  };
}
