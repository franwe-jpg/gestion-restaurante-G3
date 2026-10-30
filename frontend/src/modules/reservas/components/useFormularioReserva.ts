import { useState } from 'react';

import { useApi } from '../../../shared/hooks/useApi';
import { useToast } from '../../../shared/hooks/useToast';
import type { ToastContextValue } from '../../../shared/components/ui/toast-context';
import type { RespuestaApi } from '../../../shared/types';
import { crearReserva, listarMesasDisponibles, modificarReserva } from '../api';
import type { MesaResumen, Reserva } from '../types';

import { errorDelServidor, validarReserva } from './validarReserva';
import type { DatosFormularioReserva, ErrorDelServidor } from './validarReserva';

export interface OpcionesFormularioReserva {
  reserva?: Reserva | null;
  onGuardado: () => void;
}

const SIN_MESAS: RespuestaApi<MesaResumen[]> = { datos: [], exito: true };

/** Solo en el alta: la mesa se elige entre las disponibles para la fecha y hora cargadas. */
function useMesasDisponiblesDelFormulario(activo: boolean, fecha: string, hora: string) {
  const puedeBuscar = activo && fecha !== '' && hora !== '';
  const consulta = useApi(
    () => (puedeBuscar ? listarMesasDisponibles(fecha, hora) : Promise.resolve(SIN_MESAS)),
    `mesas-disponibles-${fecha}-${hora}`,
  );

  return {
    mesas: puedeBuscar ? (consulta.datos ?? []) : [],
    cargando: puedeBuscar && consulta.cargando,
    error: puedeBuscar ? consulta.error : null,
  };
}

/** Estado de los campos del formulario; separado para que el hook principal quede corto. */
function useCamposDelFormulario(reserva: Reserva | null) {
  const esEdicion = reserva !== null;
  const [clienteNombre, setClienteNombre] = useState(reserva?.cliente_nombre ?? '');
  const [clienteTelefono, setClienteTelefono] = useState(reserva?.cliente_telefono ?? '');
  const [fecha, setFecha] = useState(reserva?.fecha ?? '');
  const [hora, setHora] = useState(reserva ? reserva.hora.slice(0, 5) : '');
  const [cantidadPersonas, setCantidadPersonas] = useState(
    reserva ? String(reserva.cantidad_personas) : '',
  );
  const [mesaId, setMesaId] = useState(reserva ? String(reserva.mesa.id) : '');

  const cambiarFecha = (valor: string) => {
    setFecha(valor);
    if (!esEdicion) setMesaId('');
  };

  const cambiarHora = (valor: string) => {
    setHora(valor);
    if (!esEdicion) setMesaId('');
  };

  return {
    clienteNombre,
    setClienteNombre,
    clienteTelefono,
    setClienteTelefono,
    fecha,
    setFecha: cambiarFecha,
    hora,
    setHora: cambiarHora,
    cantidadPersonas,
    setCantidadPersonas,
    mesaId,
    setMesaId,
  };
}

interface EnvioReserva {
  reserva: Reserva | null;
  datos: DatosFormularioReserva;
  mostrarToast: ToastContextValue['mostrarToast'];
  onGuardado: () => void;
}

async function enviarReserva({ reserva, datos, mostrarToast, onGuardado }: EnvioReserva) {
  const cantidadPersonas = Number(datos.cantidadPersonas.trim());
  const respuesta =
    reserva === null
      ? await crearReserva({
          cliente_nombre: datos.clienteNombre.trim(),
          cliente_telefono: datos.clienteTelefono.trim(),
          fecha: datos.fecha,
          hora: datos.hora,
          cantidad_personas: cantidadPersonas,
          mesa_id: Number(datos.mesaId),
        })
      : await modificarReserva(reserva.id, {
          fecha: datos.fecha,
          hora: datos.hora,
          cantidad_personas: cantidadPersonas,
        });

  if (respuesta.exito) {
    mostrarToast({
      titulo: reserva === null ? 'Reserva creada' : 'Reserva modificada',
      variante: 'success',
    });
    onGuardado();
    return null;
  }
  const porDefecto =
    reserva === null ? 'No se pudo crear la reserva' : 'No se pudo modificar la reserva';
  return errorDelServidor(respuesta.error ?? porDefecto);
}

export function useFormularioReserva({ reserva = null, onGuardado }: OpcionesFormularioReserva) {
  const { mostrarToast } = useToast();
  const esEdicion = reserva !== null;
  const campos = useCamposDelFormulario(reserva);
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);
  const mesasDisponibles = useMesasDisponiblesDelFormulario(!esEdicion, campos.fecha, campos.hora);

  const enviar = async () => {
    if (enviando) return;
    const locales = validarReserva(campos, { incluirMesaYCliente: !esEdicion });
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    const error = await enviarReserva({ reserva, datos: campos, mostrarToast, onGuardado });
    setEnviando(false);
    if (error) setErrores(error);
  };

  return {
    esEdicion,
    ...campos,
    mesas: mesasDisponibles.mesas,
    cargandoMesas: mesasDisponibles.cargando,
    errorDeCarga: mesasDisponibles.error,
    errores,
    enviando,
    enviar,
  };
}
