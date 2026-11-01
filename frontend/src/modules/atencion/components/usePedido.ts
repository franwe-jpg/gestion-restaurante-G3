import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { crearComanda } from '../api';
import type { LineaPedido } from './DetallePedidoFila';

export function usePedido(onCreada: () => void) {
  const [mesa, setMesa] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const lineas = useLineas();
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
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
