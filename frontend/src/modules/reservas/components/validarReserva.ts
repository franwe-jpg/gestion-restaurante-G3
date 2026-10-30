const ENTERO_POSITIVO = /^[1-9]\d*$/;
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

export interface DatosFormularioReserva {
  clienteNombre: string;
  clienteTelefono: string;
  fecha: string;
  hora: string;
  cantidadPersonas: string;
  mesaId: string;
}

export type ErroresReserva = Partial<Record<keyof DatosFormularioReserva, string>>;

function errorDeClienteNombre(valor: string): string | undefined {
  const limpio = valor.trim();
  if (limpio === '') return 'El nombre del cliente es obligatorio.';
  if (!SOLO_LETRAS.test(limpio)) return 'El nombre solo puede tener letras y espacios.';
  return undefined;
}

function errorDeClienteTelefono(valor: string): string | undefined {
  if (valor.trim() === '') return 'El teléfono del cliente es obligatorio.';
  return undefined;
}

function errorDeFecha(valor: string): string | undefined {
  if (valor === '') return 'La fecha es obligatoria.';
  const hoy = new Date().toISOString().slice(0, 10);
  if (valor < hoy) return 'La fecha no puede ser anterior a hoy.';
  return undefined;
}

function errorDeHora(valor: string): string | undefined {
  if (valor === '') return 'La hora es obligatoria.';
  return undefined;
}

function errorDeCantidadPersonas(valor: string): string | undefined {
  const limpio = valor.trim();
  if (limpio === '') return 'La cantidad de personas es obligatoria.';
  if (!ENTERO_POSITIVO.test(limpio)) {
    return 'La cantidad de personas debe ser un número entero mayor a cero.';
  }
  return undefined;
}

export interface OpcionesValidarReserva {
  /** false en la modificación (HU-M5-02): el cliente y la mesa no se tocan. */
  incluirMesaYCliente: boolean;
}

export function validarReserva(
  datos: DatosFormularioReserva,
  { incluirMesaYCliente }: OpcionesValidarReserva,
): ErroresReserva {
  const errores: ErroresReserva = {};
  const fecha = errorDeFecha(datos.fecha);
  const hora = errorDeHora(datos.hora);
  const cantidadPersonas = errorDeCantidadPersonas(datos.cantidadPersonas);
  if (fecha) errores.fecha = fecha;
  if (hora) errores.hora = hora;
  if (cantidadPersonas) errores.cantidadPersonas = cantidadPersonas;

  if (incluirMesaYCliente) {
    const clienteNombre = errorDeClienteNombre(datos.clienteNombre);
    const clienteTelefono = errorDeClienteTelefono(datos.clienteTelefono);
    if (clienteNombre) errores.clienteNombre = clienteNombre;
    if (clienteTelefono) errores.clienteTelefono = clienteTelefono;
    if (datos.mesaId === '') errores.mesaId = 'La mesa es obligatoria.';
  }

  return errores;
}

export interface ErrorDelServidor extends ErroresReserva {
  general?: string;
}

/** Ubica el 409 de disponibilidad bajo Mesa y el de fecha pasada bajo Fecha; el resto es general. */
export function errorDelServidor(mensaje: string): ErrorDelServidor {
  if (/mesa disponible/i.test(mensaje)) return { mesaId: mensaje };
  if (/anterior a hoy/i.test(mensaje)) return { fecha: mensaje };
  return { general: mensaje };
}
