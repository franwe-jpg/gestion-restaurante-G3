import { useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import type { RespuestaApi } from '../../../shared/types';
import { crearReserva, modificarReserva } from '../api';
import { horaActualLocal, hoyLocal } from '../fechas';
import type { Reserva, ReservaCrear, ReservaModificar } from '../types';

import { useMesasDisponibles } from './useMesasDisponibles';
import type { EstadoMesasDisponibles } from './useMesasDisponibles';
import { errorDelServidor, turnoValido, validarReserva } from './validarReserva';
import type { DatosFormularioReserva, ErrorDelServidor, ModoReserva } from './validarReserva';

export interface OpcionesFormularioReserva {
  /** Con `reserva` el formulario modifica esa fila; sin ella da de alta una reserva nueva. */
  reserva?: Reserva;
  onGuardado: () => void;
}

const DATOS_VACIOS: DatosFormularioReserva = {
  cliente: '',
  fecha: '',
  hora: '',
  cantidad: '',
  mesa: '',
};

const TEXTOS: Record<ModoReserva, { aviso: string; error: string }> = {
  alta: { aviso: 'Reserva creada', error: 'No se pudo crear la reserva' },
  edicion: { aviso: 'Reserva modificada', error: 'No se pudo modificar la reserva' },
};

/** La edición parte de los datos de la fila del listado, sin pedirlos de nuevo a la API (S24). */
function datosIniciales(reserva?: Reserva): DatosFormularioReserva {
  if (!reserva) return DATOS_VACIOS;
  return {
    cliente: String(reserva.cliente_id),
    fecha: reserva.fecha,
    hora: reserva.hora,
    cantidad: String(reserva.cantidad_personas),
    mesa: String(reserva.mesa_id),
  };
}

function aReservaCrear(datos: DatosFormularioReserva): ReservaCrear {
  return {
    mesa_id: Number(datos.mesa),
    cliente_id: Number(datos.cliente),
    fecha: datos.fecha,
    hora: datos.hora,
    cantidad_personas: Number(datos.cantidad),
  };
}

/** Mesa, cliente y estado no cambian al modificar: la API solo recibe estos tres datos. */
function aReservaModificar(datos: DatosFormularioReserva): ReservaModificar {
  return {
    fecha: datos.fecha,
    hora: datos.hora,
    cantidad_personas: Number(datos.cantidad),
  };
}

function guardar(datos: DatosFormularioReserva, reserva?: Reserva): Promise<RespuestaApi<Reserva>> {
  return reserva
    ? modificarReserva(reserva.id, aReservaModificar(datos))
    : crearReserva(aReservaCrear(datos));
}

/**
 * La mesa elegida solo vale si la lista del turno actual, ya cargada, la incluye: mientras carga,
 * con error o sin turno válido no hay mesa vigente (S34). `mesa` es el `id` como texto.
 */
function mesaVigente(estado: EstadoMesasDisponibles, mesa: string): string {
  const incluida = estado.tipo === 'listo' && estado.mesas.some(({ id }) => String(id) === mesa);
  return incluida ? mesa : '';
}

/** Con la lista del turno ya cargada y vacía, «Guardar reserva» no tiene nada que enviar (S34). */
function listaVacia(estado: EstadoMesasDisponibles): boolean {
  return estado.tipo === 'listo' && estado.mesas.length === 0;
}

/**
 * Lista de mesas del turno que tiene el formulario y mesa vigente. Solo el alta pide la lista, y
 * solo con Fecha y Hora válidas. Cuando llega la lista del turno actual y ya no incluye la mesa
 * elegida, borra la elección (ajuste de estado durante el render, como `useListadoReservas`).
 */
function useMesasDelTurno(
  datos: DatosFormularioReserva,
  setDatos: (datos: DatosFormularioReserva) => void,
  modo: ModoReserva,
) {
  const turnoElegido = turnoValido(datos.fecha, datos.hora, hoyLocal(), horaActualLocal());
  const estadoMesas = useMesasDisponibles(datos.fecha, datos.hora, modo === 'alta' && turnoElegido);
  const mesaElegida = mesaVigente(estadoMesas, datos.mesa);
  if (estadoMesas.tipo === 'listo' && datos.mesa !== mesaElegida) {
    setDatos({ ...datos, mesa: mesaElegida });
  }
  return { estadoMesas, mesaElegida };
}

export function useFormularioReserva({ reserva, onGuardado }: OpcionesFormularioReserva) {
  const { mostrarToast } = useToast();
  const modo: ModoReserva = reserva ? 'edicion' : 'alta';
  const [datos, setDatos] = useState(() => datosIniciales(reserva));
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);
  const { estadoMesas, mesaElegida } = useMesasDelTurno(datos, setDatos, modo);

  const cambiar = (campo: keyof DatosFormularioReserva, valor: string) => {
    setDatos((anteriores) => ({ ...anteriores, [campo]: valor }));
  };

  const enviar = async () => {
    const locales = validarReserva(
      { ...datos, mesa: mesaElegida },
      modo,
      hoyLocal(),
      horaActualLocal(),
    );
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    const respuesta = await guardar(datos, reserva);
    setEnviando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: TEXTOS[modo].aviso, variante: 'success' });
      onGuardado();
      return;
    }
    setErrores(errorDelServidor(respuesta.error ?? TEXTOS[modo].error));
  };

  return {
    datos,
    cambiar,
    errores,
    enviando,
    enviar,
    estadoMesas,
    mesaVigente: mesaElegida,
    guardarDeshabilitado: enviando || listaVacia(estadoMesas),
  };
}
