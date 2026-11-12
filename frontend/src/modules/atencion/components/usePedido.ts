import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { crearComanda } from '../api';
import type { ComandaCrear, MesaSeleccionable } from '../types';
import type { LineaPedido } from './DetallePedidoFila';

function validar(mesa: string, mozoId: string, lineas: LineaPedido[]): string {
  if (!mesa) return 'Elegí una mesa';
  if (!mozoId) return 'Elegí un mozo habilitado';
  const sinElegir = lineas.findIndex((l) => !l.referencia);
  return sinElegir >= 0 ? `Elegí un producto o menú en la línea ${sinElegir + 1}` : '';
}

function crearDatos(
  mesa: string,
  mozoId: string,
  observaciones: string,
  lineas: LineaPedido[],
): ComandaCrear {
  return {
    mesa_id: Number(mesa),
    mozo_id: Number(mozoId),
    observaciones: observaciones.trim() || null,
    detalles: lineas.map((linea) => ({
      producto_id: linea.tipo === 'producto' ? Number(linea.referencia) : null,
      menu_ejecutivo_id: linea.tipo === 'menu' ? Number(linea.referencia) : null,
      cantidad: Number(linea.cantidad),
    })),
  };
}

/** La mesa inicial viaja como texto y solo vale si sigue entre las libres (D7). */
export function usePedido(
  onCreada: () => void,
  mesaInicial: string | undefined,
  mesasLibres: MesaSeleccionable[],
) {
  const [mesaElegida, setMesa] = useState(mesaInicial ?? '');
  const mesa = mesasLibres.some((m) => String(m.id) === mesaElegida) ? mesaElegida : '';
  const [mozoId, setMozoId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const lineas = useLineas();
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const invalido = validar(mesa, mozoId, lineas.lineas);
    if (invalido) {
      setError(invalido);
      return;
    }
    setGuardando(true);
    setError('');
    const respuesta = await crearComanda(crearDatos(mesa, mozoId, observaciones, lineas.lineas));
    setGuardando(false);
    if (!respuesta.exito) {
      setError(respuesta.error ?? 'No se pudo crear la comanda');
      return;
    }
    onCreada();
  }
  return {
    mesa,
    setMesa,
    mozoId,
    setMozoId,
    observaciones,
    setObservaciones,
    ...lineas,
    error,
    guardando,
    enviar,
  };
}

function useLineas() {
  const [lineas, setLineas] = useState<LineaPedido[]>([
    { clave: 0, tipo: 'producto', referencia: '', cantidad: '1' },
  ]);
  const siguiente = useRef(1);
  function agregar() {
    const nueva: LineaPedido = {
      clave: siguiente.current++,
      tipo: 'producto',
      referencia: '',
      cantidad: '1',
    };
    setLineas((actuales) => [...actuales, nueva]);
  }
  function cambiar(nueva: LineaPedido) {
    setLineas((ls) => ls.map((l) => (l.clave === nueva.clave ? nueva : l)));
  }
  function quitar(clave: number) {
    setLineas((ls) => ls.filter((l) => l.clave !== clave));
  }
  return { lineas, agregar, cambiar, quitar };
}
