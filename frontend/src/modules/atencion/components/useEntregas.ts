import { useEffect, useRef, useState } from 'react';
import { consultarEntregas, marcarListo, registrarEntrega } from '../api';
import type { RespuestaApi } from '../../../shared/types';
import type { EntregasComanda } from '../types';

/** Carga las entregas de una comanda y registra cambios de a una llamada por vez. */
export function useEntregas(id: number) {
  const [datos, setDatos] = useState<EntregasComanda | null>(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    let vigente = true;
    void consultarEntregas(id).then((r) => {
      if (!vigente) return;
      if (r.exito && r.datos) setDatos(r.datos);
      else setError(r.error ?? 'No se pudieron consultar las entregas');
    });
    return () => {
      vigente = false;
      montado.current = false;
    };
  }, [id]);
  async function enviar(llamada: () => Promise<RespuestaApi<EntregasComanda>>, mensaje: string) {
    if (enviando) return;
    setEnviando(true);
    setError('');
    const respuesta = await llamada();
    if (!montado.current) return;
    if (respuesta.exito && respuesta.datos) {
      setDatos(respuesta.datos);
    } else {
      setError(respuesta.error ?? mensaje);
      const actual = await consultarEntregas(id);
      if (montado.current && actual.exito && actual.datos) setDatos(actual.datos);
    }
    if (montado.current) setEnviando(false);
  }
  const registrar = (detalleId: number, valor: number) =>
    enviar(() => registrarEntrega(id, detalleId, valor), 'No se pudo registrar la entrega');
  const marcar = (detalleId: number, valor: number) =>
    enviar(() => marcarListo(id, detalleId, valor), 'No se pudo marcar el producto como listo');
  return { datos, error, enviando, registrar, marcarListo: marcar };
}
