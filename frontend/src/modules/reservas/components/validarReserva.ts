import type { ClienteEncontrado } from '../types';

/**
 * Cliente de la reserva: ninguno todavía, uno registrado que se eligió de la búsqueda o uno nuevo
 * cuyos datos se escriben en el modal. Los dos últimos son excluyentes (Decisión 30).
 */
export type SeleccionCliente =
  | { tipo: 'ninguno' }
  | { tipo: 'existente'; cliente: ClienteEncontrado }
  | { tipo: 'nuevo'; nombre: string; telefono: string };

/** Valores tal como los escribe la persona: todo texto, se convierte al enviar. */
export interface DatosFormularioReserva {
  cliente: SeleccionCliente;
  fecha: string;
  hora: string;
  cantidad: string;
  mesa: string;
}

/** Un error por campo; Nombre y Teléfono son los del cliente nuevo (no están en los datos). */
export type ErroresReserva = Partial<
  Record<keyof DatosFormularioReserva | 'nombre' | 'telefono', string>
>;

/** En la edición Cliente y Mesa no cambian: se muestran deshabilitados y no se validan. */
export type ModoReserva = 'alta' | 'edicion';

const ENTERO_POSITIVO = /^[1-9]\d*$/;

function errorDeEntero(valor: string, obligatorio: string, invalido: string): string | undefined {
  const limpio = valor.trim();
  if (limpio === '') return obligatorio;
  return ENTERO_POSITIVO.test(limpio) ? undefined : invalido;
}

function textoDePersonas(cantidad: number): string {
  return cantidad === 1 ? '1 persona' : `${cantidad} personas`;
}

/**
 * Supuesto S67 (corrección 2026-11-11, pendiente de validación del equipo): la cantidad no puede
 * superar la capacidad de la mesa. Sin capacidad conocida (sin mesa elegida o en la edición, donde
 * la fila no la trae) solo se exige un entero positivo y la API responde 409 si no entra.
 */
function errorDeCantidad(cantidad: string, capacidad?: number): string | undefined {
  const error = errorDeEntero(
    cantidad,
    'La cantidad de personas es obligatoria.',
    'La cantidad de personas debe ser un entero positivo.',
  );
  if (error !== undefined || capacidad === undefined) return error;
  return Number(cantidad.trim()) > capacidad
    ? `La mesa elegida admite hasta ${textoDePersonas(capacidad)}.`
    : undefined;
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

const NOMBRE_VALIDO = /^[\p{L} ]+$/u;
const TELEFONO_VALIDO = /^\+?[0-9 -]+$/;

/**
 * Supuesto S66 (corrección 2026-11-11, pendiente de validación del equipo): `+` opcional solo al
 * inicio, dígitos, espacios y guiones; entre 6 y 15 dígitos (15 es el máximo de E.164) y hasta 20
 * caracteres en total; los espacios de los extremos se recortan. Es la regla de `ClienteNuevo` del
 * backend de M5 (`reservas/schemas.py`), con los mismos textos.
 */
export const TELEFONO_LARGO_MAXIMO = 20;
const TELEFONO_DIGITOS_MINIMO = 6;
const TELEFONO_DIGITOS_MAXIMO = 15;

export interface ErroresClienteNuevo {
  nombre?: string;
  telefono?: string;
}

function errorDeNombre(nombre: string): string | undefined {
  if (nombre === '') return 'El nombre es obligatorio';
  return NOMBRE_VALIDO.test(nombre) ? undefined : 'El nombre debe contener solo letras';
}

function errorDeTelefono(telefono: string): string | undefined {
  if (telefono === '') return 'El teléfono es obligatorio';
  if (!TELEFONO_VALIDO.test(telefono)) {
    return 'El teléfono solo admite dígitos, espacios, guiones y + al inicio';
  }
  if (telefono.length > TELEFONO_LARGO_MAXIMO) {
    return `El teléfono admite hasta ${TELEFONO_LARGO_MAXIMO} caracteres`;
  }
  const digitos = telefono.replace(/\D/g, '').length;
  return digitos < TELEFONO_DIGITOS_MINIMO || digitos > TELEFONO_DIGITOS_MAXIMO
    ? `El teléfono debe tener entre ${TELEFONO_DIGITOS_MINIMO} y ${TELEFONO_DIGITOS_MAXIMO} dígitos`
    : undefined;
}

/**
 * Lo que se deja escribir en el campo Teléfono (S66): dígitos, espacios, guiones y un `+` solo al
 * inicio. Quita el resto sin avisar; la regla completa (largo y dígitos) la aplica `validarReserva`.
 */
export function filtrarTelefono(texto: string): string {
  const conservado = texto.replace(/[^0-9 +-]/g, '');
  const prefijo = conservado.startsWith('+') ? '+' : '';
  return prefijo + conservado.replace(/\+/g, '');
}

/**
 * Nombre: reglas de `ClienteNuevo` de M4 (`backend/app/modules/atencion/schemas.py`), copiadas y no
 * importadas (AGENTS.md §9.4, S42), con los textos de `ClienteFormDialog` de M4. No puede ser más
 * estricto que M4: acepta letras y espacios (también seguidos) y se evalúa sobre el texto recortado.
 * Teléfono: la regla propia de S66, que es más estricta que la de M4 en el largo.
 */
export function validarClienteNuevo(nombre: string, telefono: string): ErroresClienteNuevo {
  return { nombre: errorDeNombre(nombre.trim()), telefono: errorDeTelefono(telefono.trim()) };
}

function erroresDeCliente(cliente: SeleccionCliente): ErroresReserva {
  if (cliente.tipo === 'ninguno') return { cliente: 'El cliente es obligatorio.' };
  if (cliente.tipo === 'nuevo') return validarClienteNuevo(cliente.nombre, cliente.telefono);
  return {};
}

function erroresDeClienteYMesa(datos: DatosFormularioReserva): ErroresReserva {
  return { ...erroresDeCliente(datos.cliente), mesa: errorDeMesa(datos.mesa) };
}

function erroresDelTurno(
  datos: DatosFormularioReserva,
  hoy: string,
  horaActual: string,
  capacidad?: number,
): ErroresReserva {
  return {
    fecha: errorDeFecha(datos.fecha, hoy),
    hora: errorDeHora(datos.hora, datos.fecha, hoy, horaActual),
    cantidad: errorDeCantidad(datos.cantidad, capacidad),
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
 * Mesa solo se validan en el alta, y Mesa solo debe estar elegida. `capacidadDeLaMesa`, si se
 * conoce, limita la cantidad de personas (S67).
 */
export function validarReserva(
  datos: DatosFormularioReserva,
  modo: ModoReserva,
  hoy: string,
  horaActual: string,
  capacidadDeLaMesa?: number,
): ErroresReserva {
  const encontrados: ErroresReserva = {
    ...(modo === 'alta' ? erroresDeClienteYMesa(datos) : {}),
    ...erroresDelTurno(datos, hoy, horaActual, capacidadDeLaMesa),
  };
  return Object.fromEntries(
    Object.entries(encontrados).filter(([, mensaje]) => mensaje !== undefined),
  );
}

export interface ErrorDelServidor extends ErroresReserva {
  general?: string;
}

const CAMPO_DEL_CLIENTE = /(?:^|[\s.])(nombre|telefono):/;

/**
 * El 404, 409 y 422 de la API traen su texto en `detalle`: se muestra como error general. Con un
 * cliente nuevo, el 422 que nombra `nombre` o `telefono` (`Datos invalidos. telefono: ...` de M4 o
 * `cliente_nuevo.telefono: ...` de la forma) se muestra junto a ese campo (Decisión 31).
 */
export function errorDelServidor(mensaje: string, seleccion: SeleccionCliente): ErrorDelServidor {
  const campo = seleccion.tipo === 'nuevo' ? CAMPO_DEL_CLIENTE.exec(mensaje)?.[1] : undefined;
  if (campo === 'nombre' || campo === 'telefono') return { [campo]: mensaje };
  return { general: mensaje };
}
