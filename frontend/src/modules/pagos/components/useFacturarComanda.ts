import { useEffect, useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import { generarFactura, previsualizarFactura } from '../api';
import type { FacturaPrevia } from '../types';

import { normalizarImporte, validarImporte } from './validarCobro';

export interface ErroresFacturar {
  comanda?: string;
  medioPago?: string;
  importe?: string;
  general?: string;
}

interface ResultadoPrevia {
  previa?: FacturaPrevia;
  errores: ErroresFacturar;
}

async function pedirPrevia(comanda: string): Promise<ResultadoPrevia> {
  const id = Number(comanda);
  if (!Number.isInteger(id) || id <= 0) {
    return { errores: { comanda: 'Ingresá el número de la comanda.' } };
  }
  const respuesta = await previsualizarFactura(id);
  if (respuesta.exito && respuesta.datos) return { previa: respuesta.datos, errores: {} };
  return { errores: { general: respuesta.error ?? 'No se pudo obtener la factura' } };
}

function validarCobro(previa: FacturaPrevia, medioPagoId: string, importe: string) {
  return {
    medioPago: medioPagoId === '' ? 'Elegí un medio de pago.' : undefined,
    importe: validarImporte(importe, previa.total),
  };
}

function enviarCobro(previa: FacturaPrevia, medioPagoId: string, importe: string) {
  return generarFactura({
    comanda_id: previa.comanda_id,
    cobro: { medio_pago_id: Number(medioPagoId), monto: normalizarImporte(importe) },
  });
}

interface Destinos {
  setErrores: (errores: ErroresFacturar) => void;
  setPrevia: (previa: FacturaPrevia) => void;
  setImporte: (importe: string) => void;
}

/** S4-03: al llegar por el enlace desde Atención, pide la vista previa sin pasar por el campo. */
function usePreviaInicial(comandaInicial: string | undefined, destinos: Destinos) {
  const { setErrores, setPrevia, setImporte } = destinos;
  useEffect(() => {
    if (!comandaInicial) return;
    let vigente = true;
    void pedirPrevia(comandaInicial).then((resultado) => {
      if (!vigente) return;
      setErrores(resultado.errores);
      if (!resultado.previa) return;
      setPrevia(resultado.previa);
      setImporte(resultado.previa.total);
    });
    return () => {
      vigente = false;
    };
  }, [comandaInicial, setErrores, setPrevia, setImporte]);
}

function useEstadoFactura(comandaInicial: string | undefined) {
  const [comanda, setComanda] = useState(comandaInicial ?? '');
  const [previa, setPrevia] = useState<FacturaPrevia | null>(null);
  const [medioPagoId, setMedioPagoId] = useState('');
  const [importe, setImporte] = useState('');
  const [errores, setErrores] = useState<ErroresFacturar>({});
  usePreviaInicial(comandaInicial, { setErrores, setPrevia, setImporte });
  return {
    ...{ comanda, setComanda, previa, setPrevia, medioPagoId, setMedioPagoId },
    ...{ importe, setImporte, errores, setErrores },
  };
}

/** HU-M6-01: primero la vista previa de la comanda; luego medio de pago, importe y confirmar. */
export function useFacturarComanda({
  onGenerada,
  comandaInicial,
}: {
  onGenerada: () => void;
  comandaInicial?: string;
}) {
  const { mostrarToast } = useToast();
  const estado = useEstadoFactura(comandaInicial);
  const { comanda, previa, medioPagoId, importe, setErrores, setPrevia, setImporte } = estado;
  const [enviando, setEnviando] = useState(false);

  const verFactura = async () => {
    if (enviando) return;
    setEnviando(true);
    const resultado = await pedirPrevia(comanda);
    setEnviando(false);
    setErrores(resultado.errores);
    if (!resultado.previa) return;
    setPrevia(resultado.previa);
    setImporte(resultado.previa.total);
  };

  const confirmar = async () => {
    if (enviando || previa === null) return;
    const locales = validarCobro(previa, medioPagoId, importe);
    setErrores(locales);
    if (locales.medioPago || locales.importe) return;

    setEnviando(true);
    const respuesta = await enviarCobro(previa, medioPagoId, importe);
    setEnviando(false);
    if (!respuesta.exito) {
      setErrores({ general: respuesta.error ?? 'No se pudo generar la factura' });
      return;
    }
    mostrarToast({ titulo: 'Factura generada', variante: 'success' });
    onGenerada();
  };

  return { ...estado, enviando, verFactura, confirmar };
}
