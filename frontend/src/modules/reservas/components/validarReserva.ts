/** Valores tal como los escribe la persona: todo texto, se convierte al enviar. */
export interface DatosFormularioReserva {
  cliente: string;
  fecha: string;
  hora: string;
  cantidad: string;
  mesa: string;
}

export type ErroresReserva = Partial<Record<keyof DatosFormularioReserva, string>>;

/** El modo edición se agrega con su prueba en la Fase 7. */
export type ModoReserva = 'alta';

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

/**
 * Valida el formulario sin leer el reloj: `hoy` (`YYYY-MM-DD`) y `horaActual` (`HH:MM`) llegan
 * por parámetro. Si la fecha es hoy, la hora tiene que ser posterior a la actual (S3).
 */
export function validarReserva(
  datos: DatosFormularioReserva,
  _modo: ModoReserva,
  hoy: string,
  horaActual: string,
): ErroresReserva {
  const encontrados: ErroresReserva = {
    cliente: errorDeEntero(
      datos.cliente,
      'El cliente es obligatorio.',
      'El cliente debe ser un entero positivo.',
    ),
    fecha: errorDeFecha(datos.fecha, hoy),
    hora: errorDeHora(datos.hora, datos.fecha, hoy, horaActual),
    cantidad: errorDeEntero(
      datos.cantidad,
      'La cantidad de personas es obligatoria.',
      'La cantidad de personas debe ser un entero positivo.',
    ),
    mesa: errorDeEntero(
      datos.mesa,
      'La mesa es obligatoria.',
      'La mesa debe ser un entero positivo.',
    ),
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
