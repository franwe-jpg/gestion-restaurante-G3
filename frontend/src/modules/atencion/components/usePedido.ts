import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { crearComanda } from '../api';
import type { MesaSeleccionable } from '../types';
import type { LineaPedido } from './DetallePedidoFila';

function validar(mesa: string, lineas: LineaPedido[]): string {
  if (!mesa) return 'Elegí una mesa';
  const sinElegir = lineas.findIndex((l) => !l.referencia);
  return sinElegir >= 0 ? `Elegí un producto o menú en la línea ${sinElegir + 1}` : '';
}

/** La mesa inicial viaja como texto y solo vale si sigue entre las libres (D7). */
export function usePedido(
  onCreada: () => void,
  mesaInicial: string | undefined,
  mesasLibres: MesaSeleccionable[],
) {
  const [mesaElegida, setMesa] = useState(mesaInicial ?? '');
  const mesa = mesasLibres.some((m) => String(m.id) === mesaElegida) ? mesaElegida : '';
  const [observaciones, setObservaciones] = useState('');
  const lineas = useLineas();
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const invalido = validar(mesa, lineas.lineas);
    if (invalido) {
      setError(invalido);
      return;
    }
    setGuardando(true);
    setError('');
    const respuesta = await crearComanda({
      mesa_id: Number(mesa),
      observaciones: observaciones.trim() || null,
      detalles: lineas.lineas.map((l) => ({
        producto_id: l.tipo === 'producto' ? Number(l.referencia) : null,
        menu_ejecutivo_id: l.tipo === 'menu' ? Number(l.referencia) : null,
        cantidad: Number(l.cantidad),
      })),
    });
    setGuardando(false);
    if (!respuesta.exito) {
      setError(respuesta.error ?? 'No se pudo crear la comanda');
      return;
    }
    onCreada();
  }
  return { mesa, setMesa, observaciones, setObservaciones, ...lineas, error, guardando, enviar };
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
