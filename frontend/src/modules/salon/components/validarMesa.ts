const ENTERO_POSITIVO = /^[1-9]\d*$/;

export interface DatosFormularioMesa {
  numero: string;
  capacidad: string;
  sectorId: string;
}

export type ErroresMesa = Partial<Record<keyof DatosFormularioMesa, string>>;

function errorDeNumero(numero: string): string | undefined {
  const limpio = numero.trim();
  if (limpio === '') return 'El número es obligatorio.';
  if (!ENTERO_POSITIVO.test(limpio)) return 'El número debe ser un número entero mayor a cero.';
  return undefined;
}

function errorDeCapacidad(capacidad: string): string | undefined {
  const limpio = capacidad.trim();
  if (limpio === '') return 'La capacidad es obligatoria.';
  if (!ENTERO_POSITIVO.test(limpio)) {
    return 'La capacidad debe ser un número entero mayor a cero.';
  }
  return undefined;
}

export function validarMesa(datos: DatosFormularioMesa): ErroresMesa {
  const errores: ErroresMesa = {};
  const numero = errorDeNumero(datos.numero);
  const capacidad = errorDeCapacidad(datos.capacidad);
  if (numero) errores.numero = numero;
  if (capacidad) errores.capacidad = capacidad;
  if (datos.sectorId === '') errores.sectorId = 'El sector es obligatorio.';
  return errores;
}

export interface ErrorDelServidor extends ErroresMesa {
  general?: string;
}

/** Ubica el 409 del número repetido bajo Número y el del sector bajo Sector; el resto es general. */
export function errorDelServidor(mensaje: string): ErrorDelServidor {
  if (/ya existe/i.test(mensaje)) return { numero: mensaje };
  if (/deshabilitado/i.test(mensaje)) return { sectorId: mensaje };
  return { general: mensaje };
}
