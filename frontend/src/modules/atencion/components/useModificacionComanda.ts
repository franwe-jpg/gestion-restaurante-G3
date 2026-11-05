import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { modificarComanda } from '../api';
import type { Comanda, DetalleComandaSalida } from '../types';
import type { LineaPedido } from './DetallePedidoFila';

function nuevaLinea(clave: number): LineaPedido {
  return { clave, tipo: 'producto', referencia: '', cantidad: '1' };
}

function restantesSinQuitar(
  detalles: DetalleComandaSalida[],
  quitar: number[],
): DetalleComandaSalida[] {
  return detalles.filter(
    (detalle) => detalle.id === undefined || detalle.id === null || !quitar.includes(detalle.id),
  );
}

function calcularTotal(detalles: DetalleComandaSalida[]): number {
  return detalles.reduce(
    (acumulado, detalle) =>
      acumulado + Number(detalle.precio_unitario) * detalle.cantidad - Number(detalle.descuento),
    0,
  );
}

function useQuitarDetalles() {
  const [quitar, setQuitar] = useState<number[]>([]);
  function alternar(detalleId: number) {
    setQuitar((actuales) =>
      actuales.includes(detalleId)
        ? actuales.filter((actual) => actual !== detalleId)
        : [...actuales, detalleId],
    );
  }
  return { quitar, alternar, limpiar: () => setQuitar([]) };
}

function useNuevasLineas() {
  const [nuevas, setNuevas] = useState<LineaPedido[]>([]);
  const siguiente = useRef(1000);
  function agregar() {
    setNuevas((actuales) => [...actuales, nuevaLinea(siguiente.current++)]);
  }
  function cambiar(nueva: LineaPedido) {
    setNuevas((actuales) => actuales.map((linea) => (linea.clave === nueva.clave ? nueva : linea)));
  }
  function quitarLinea(clave: number) {
    setNuevas((actuales) => actuales.filter((linea) => linea.clave !== clave));
  }
  return { nuevas, agregar, cambiar, quitarLinea, limpiar: () => setNuevas([]) };
}

function useEnvioModificacion(
  id: number,
  quitar: number[],
  nuevas: LineaPedido[],
  alGuardar: (comanda: Comanda) => void,
  puedeEnviar: () => boolean,
) {
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!puedeEnviar() || guardando) return;
    setGuardando(true);
    setError('');
    setAviso('');
    const respuesta = await modificarComanda(id, {
      quitar,
      agregar: nuevas.map((linea) => ({
        producto_id: linea.tipo === 'producto' ? Number(linea.referencia) : null,
        menu_ejecutivo_id: linea.tipo === 'menu' ? Number(linea.referencia) : null,
        cantidad: Number(linea.cantidad),
      })),
    });
    setGuardando(false);
    if (!respuesta.exito || !respuesta.datos) {
      setError(respuesta.error ?? 'No se pudo modificar la comanda');
      return;
    }
    alGuardar(respuesta.datos);
    setAviso('Cambios guardados');
  }

  return { error, aviso, guardando, enviar };
}

export function useModificacionComanda(
  id: number,
  comanda: Comanda | null,
  setComanda: (comanda: Comanda) => void,
  onModificada: () => void,
) {
  const quitados = useQuitarDetalles();
  const lineas = useNuevasLineas();
  const detalles = comanda?.detalles ?? [];
  const restantes = restantesSinQuitar(detalles, quitados.quitar);
  const sinCambios = quitados.quitar.length === 0 && lineas.nuevas.length === 0;
  const sinDetalles = restantes.length + lineas.nuevas.length === 0;
  const envio = useEnvioModificacion(
    id,
    quitados.quitar,
    lineas.nuevas,
    (actualizada) => {
      setComanda(actualizada);
      quitados.limpiar();
      lineas.limpiar();
      onModificada();
    },
    () => !sinCambios && !sinDetalles,
  );

  return {
    ...quitados,
    ...lineas,
    ...envio,
    detalles,
    total: calcularTotal(restantes),
    sinCambios,
    sinDetalles,
  };
}
