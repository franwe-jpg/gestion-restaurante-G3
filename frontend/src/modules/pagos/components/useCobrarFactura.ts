import { useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import { useApi } from '../../../shared/hooks/useApi';
import { obtenerFactura, registrarCobro } from '../api';
import type { FacturaResumen } from '../types';

import { normalizarImporte, validarMontoCobro } from './validarCobro';

export interface ErroresCobro {
  medioPago?: string;
  importe?: string;
  general?: string;
}

interface OpcionesCobrarFactura {
  factura: FacturaResumen;
  onCobrada: () => void;
}

/** HU-M6-02: carga la factura, valida el cobro y lo registra. */
export function useCobrarFactura({ factura, onCobrada }: OpcionesCobrarFactura) {
  const { mostrarToast } = useToast();
  const consulta = useApi(() => obtenerFactura(factura.id), `factura-cobro-${factura.id}`);
  const [medioPagoId, setMedioPagoId] = useState('');
  const [importe, setImporte] = useState(factura.saldo_pendiente);
  const [errores, setErrores] = useState<ErroresCobro>({});
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    if (enviando || consulta.datos === null) return;
    const locales = {
      medioPago: medioPagoId === '' ? 'Elegí un medio de pago.' : undefined,
      importe: validarMontoCobro(importe, consulta.datos.saldo_pendiente),
    };
    setErrores(locales);
    if (locales.medioPago || locales.importe) return;

    setEnviando(true);
    const respuesta = await registrarCobro(factura.id, {
      medio_pago_id: Number(medioPagoId),
      monto: normalizarImporte(importe),
    });
    setEnviando(false);
    if (!respuesta.exito) {
      setErrores({ general: respuesta.error ?? 'No se pudo registrar el cobro' });
      return;
    }
    mostrarToast({ titulo: 'Cobro registrado', variante: 'success' });
    onCobrada();
  };

  return {
    completa: consulta.datos,
    cargando: consulta.cargando,
    errorCarga: consulta.error,
    recargar: consulta.recargar,
    medioPagoId,
    setMedioPagoId,
    importe,
    setImporte,
    errores,
    enviando,
    confirmar,
  };
}
