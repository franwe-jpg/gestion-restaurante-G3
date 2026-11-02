/** Valores tal como los escribe la persona: todo texto, se convierte al enviar. */
export interface DatosFormularioReserva {
  cliente: string;
  fecha: string;
  hora: string;
  cantidad: string;
  mesa: string;
}

export type ErroresReserva = Partial<Record<keyof DatosFormularioReserva, string>>;

/** En la edición Cliente y Mesa no cambian: se muestran deshabilitados y no se validan. */
export type ModoReserva = 'alta' | 'edicion';

const ENTERO_POSITIVO = /^[1-9]\d*$/;

function errorDeEntero(valor: string, obligatorio: string, invalido: string): string | undefined {
  const limpio = valor.trim();
  if (limpio === '') return obligatorio;
  return ENTERO_POSITIVO.test(limpio) ? undefined : invalido;
}

function errorDeFecha(fecha: string, hoy: string): string | undefined {
  if (fecha.trim() === '') return 'La fecha es obligatoria.';
  return fecha < hoy ? 'La fecha no puede ser anterior a hoy.' : undefined;
}

function errorDeHora(
  hora: string,
  fecha: string,
  hoy: string,
  horaActual: string,
): string | undefined {
  if (hora.trim() === '') return 'La hora es obligatoria.';
  const esHoy = fecha === hoy;
  return esHoy && hora <= horaActual ? 'La hora debe ser posterior a la hora actual.' : undefined;
}

/** El valor sale de una opción del selector de mesas disponibles: solo se exige que haya una. */
function errorDeMesa(mesa: string): string | undefined {
  return mesa === '' ? 'La mesa es obligatoria.' : undefined;
}

function erroresDeClienteYMesa(datos: DatosFormularioReserva): ErroresReserva {
  return {
    cliente: errorDeEntero(
      datos.cliente,
      'El cliente es obligatorio.',
      'El cliente debe ser un entero positivo.',
    ),
    mesa: errorDeMesa(datos.mesa),
  };
}

function erroresDelTurno(
  datos: DatosFormularioReserva,
  hoy: string,
  horaActual: string,
): ErroresReserva {
  return {
    fecha: errorDeFecha(datos.fecha, hoy),
    hora: errorDeHora(datos.hora, datos.fecha, hoy, horaActual),
    cantidad: errorDeEntero(
      datos.cantidad,
      'La cantidad de personas es obligatoria.',
      'La cantidad de personas debe ser un entero positivo.',
    ),
  };
}

/**
 * `true` si Fecha y Hora pasan las reglas de `validarReserva` (Fecha y Hora obligatorias, Fecha no
 * anterior a hoy y, si es hoy, Hora posterior a la actual). Con un turno válido el alta puede pedir
 * la lista de mesas disponibles (S34).
 */
export function turnoValido(fecha: string, hora: string, hoy: string, horaActual: string): boolean {
  return (
    errorDeFecha(fecha, hoy) === undefined &&
    errorDeHora(hora, fecha, hoy, horaActual) === undefined
  );
}

/**
 * Valida el formulario sin leer el reloj: `hoy` (`YYYY-MM-DD`) y `horaActual` (`HH:MM`) llegan
 * por parámetro. Si la fecha es hoy, la hora tiene que ser posterior a la actual (S3). Cliente y
 * Mesa solo se validan en el alta, y Mesa solo debe estar elegida.
 */
export function validarReserva(
  datos: DatosFormularioReserva,
  modo: ModoReserva,
  hoy: string,
  horaActual: string,
): ErroresReserva {
  const encontrados: ErroresReserva = {
    ...(modo === 'alta' ? erroresDeClienteYMesa(datos) : {}),
    ...erroresDelTurno(datos, hoy, horaActual),
  };
  return Object.fromEntries(
    Object.entries(encontrados).filter(([, mensaje]) => mensaje !== undefined),
  );
}

export interface ErrorDelServidor extends ErroresReserva {
  general?: string;
}

/** El 404, 409 y 422 de la API traen su texto en `detalle`: se muestra como error general. */
export function errorDelServidor(mensaje: string): ErrorDelServidor {
  return { general: mensaje };
}
