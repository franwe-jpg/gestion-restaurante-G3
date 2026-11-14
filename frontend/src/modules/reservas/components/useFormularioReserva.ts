import { useEffect, useRef, useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import type { RespuestaApi } from '../../../shared/types';
import { crearReserva, modificarReserva } from '../api';
import { horaActualLocal, hoyLocal } from '../fechas';
import type { Reserva, ReservaCrear, ReservaModificar } from '../types';

import { useMesasDisponibles } from './useMesasDisponibles';
import type { EstadoMesasDisponibles } from './useMesasDisponibles';
import { errorDelServidor, turnoValido, validarReserva } from './validarReserva';
import type {
  DatosFormularioReserva,
  ErrorDelServidor,
  ModoReserva,
  SeleccionCliente,
} from './validarReserva';

export interface OpcionesFormularioReserva {
  /** Con `reserva` el formulario modifica esa fila; sin ella da de alta una reserva nueva. */
  reserva?: Reserva;
  onGuardado: () => void;
}

const DATOS_VACIOS: DatosFormularioReserva = {
  cliente: { tipo: 'ninguno' },
  fecha: '',
  hora: '',
  cantidad: '',
  mesa: '',
};

const TEXTOS: Record<ModoReserva, { aviso: string; error: string }> = {
  alta: { aviso: 'Reserva creada', error: 'No se pudo crear la reserva' },
  edicion: { aviso: 'Reserva modificada', error: 'No se pudo modificar la reserva' },
};

/** Campos de texto del formulario: el cliente se elige con `elegirCliente`, no se escribe. */
export type CampoReserva = Exclude<keyof DatosFormularioReserva, 'cliente'>;

/**
 * La edición parte de los datos de la fila del listado, sin pedirlos de nuevo a la API (S24). El
 * cliente de la edición no cambia ni se envía: queda en `ninguno` y la pantalla muestra el de la fila.
 */
function datosIniciales(reserva?: Reserva): DatosFormularioReserva {
  if (!reserva) return DATOS_VACIOS;
  return {
    cliente: DATOS_VACIOS.cliente,
    fecha: reserva.fecha,
    hora: reserva.hora,
    cantidad: String(reserva.cantidad_personas),
    mesa: String(reserva.mesa_id),
  };
}

/** Un cliente registrado viaja como `cliente_id`; uno nuevo, como `cliente_nuevo` (nunca los dos). */
function aClienteDeReserva(cliente: SeleccionCliente) {
  if (cliente.tipo === 'nuevo') {
    return { cliente_nuevo: { nombre: cliente.nombre.trim(), telefono: cliente.telefono.trim() } };
  }
  // `ninguno` no llega acá: la validación local lo frena. Con 0 la API lo rechazaría con 422.
  return { cliente_id: cliente.tipo === 'existente' ? cliente.cliente.id : 0 };
}

function aReservaCrear(datos: DatosFormularioReserva): ReservaCrear {
  return {
    mesa_id: Number(datos.mesa),
    ...aClienteDeReserva(datos.cliente),
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

/**
 * Capacidad de la mesa elegida según la lista del turno (S67). Sin mesa elegida o sin lista
 * cargada, y en la edición (no pide la lista), es `undefined`: la API valida la capacidad con 409.
 */
function capacidadDeMesa(estado: EstadoMesasDisponibles, mesa: string): number | undefined {
  if (estado.tipo !== 'listo') return undefined;
  return estado.mesas.find(({ id }) => String(id) === mesa)?.capacidad;
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

/** Estado de los datos escritos y sus cambios; la edición parte de los datos de la fila. */
function useDatosReserva(reserva?: Reserva) {
  const [datos, setDatos] = useState(() => datosIniciales(reserva));

  const cambiar = (campo: CampoReserva, valor: string) => {
    setDatos((anteriores) => ({ ...anteriores, [campo]: valor }));
  };

  const elegirCliente = (cliente: SeleccionCliente) => {
    setDatos((anteriores) => ({ ...anteriores, cliente }));
  };

  return { datos, setDatos, cambiar, elegirCliente };
}

export function useFormularioReserva({ reserva, onGuardado }: OpcionesFormularioReserva) {
  const { mostrarToast } = useToast();
  const modo: ModoReserva = reserva ? 'edicion' : 'alta';
  const { datos, setDatos, cambiar, elegirCliente } = useDatosReserva(reserva);
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);
  const { estadoMesas, mesaElegida } = useMesasDelTurno(datos, setDatos, modo);
  /** `true` mientras el modal que creó este formulario sigue montado (S38). */
  const vigente = useRef(false);

  useEffect(() => {
    vigente.current = true;
    return () => {
      vigente.current = false;
    };
  }, []);

  const enviar = async () => {
    const locales = validarReserva(
      { ...datos, mesa: mesaElegida },
      modo,
      hoyLocal(),
      horaActualLocal(),
      capacidadDeMesa(estadoMesas, mesaElegida),
    );
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    const respuesta = await guardar(datos, reserva);
    if (!vigente.current) return; // el modal se cerró: la respuesta no toca nada (S38)
    setEnviando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: TEXTOS[modo].aviso, variante: 'success' });
      onGuardado();
      return;
    }
    setErrores(errorDelServidor(respuesta.error ?? TEXTOS[modo].error, datos.cliente));
  };

  return {
    datos,
    cambiar,
    elegirCliente,
    errores,
    enviando,
    enviar,
    estadoMesas,
    mesaVigente: mesaElegida,
    guardarDeshabilitado: enviando || listaVacia(estadoMesas),
  };
}
