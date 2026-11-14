import type { DiaSemana, TipoPromocion } from '../types';

export interface DatosFormularioPromocion {
  nombre: string;
  tipo: TipoPromocion;
  descripcion: string;
  producto_ids: number[];
  fecha_desde: string;
  fecha_hasta: string;
  dias_semana: DiaSemana[];
  hora_desde: string;
  hora_hasta: string;
  descuento_porcentaje: string;
  precio_fijo: string;
  cant_lleva: string;
  cant_paga: string;
}

export interface ErroresPromocion {
  nombre?: string;
  descripcion?: string;
  producto_ids?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  dias_semana?: string;
  hora_desde?: string;
  hora_hasta?: string;
  descuento_porcentaje?: string;
  precio_fijo?: string;
  cant_paga?: string;
  general?: string;
}

const ENTERO_POSITIVO = /^\d+$/;
const PRECIO = /^\d+(\.\d{1,2})?$/;

function validarNombre(nombreIngresado: string): string | undefined {
  const nombre = nombreIngresado.trim();
  if (!nombre) return 'El nombre es obligatorio.';
  if (nombre.length > 100) return 'El nombre supera los 100 caracteres permitidos.';
  return undefined;
}

function errorDeFecha(datos: DatosFormularioPromocion): ErroresPromocion {
  const errores: ErroresPromocion = {};
  if (!datos.fecha_desde) errores.fecha_desde = 'La fecha desde es obligatoria.';
  if (!datos.fecha_hasta) errores.fecha_hasta = 'La fecha hasta es obligatoria.';
  if (datos.fecha_desde && datos.fecha_hasta && datos.fecha_hasta < datos.fecha_desde) {
    errores.fecha_hasta = 'La fecha hasta no puede ser anterior a la fecha desde.';
  }
  return errores;
}

function errorDeHorario(datos: DatosFormularioPromocion): ErroresPromocion {
  const desde = datos.hora_desde.trim();
  const hasta = datos.hora_hasta.trim();
  if (!desde && !hasta) return {};
  if (!desde) return { hora_desde: 'Completá la hora desde o dejá la franja vacía.' };
  if (!hasta) return { hora_hasta: 'Completá la hora hasta o dejá la franja vacía.' };
  if (hasta <= desde) {
    return { hora_hasta: 'La hora hasta debe ser posterior a la hora desde.' };
  }
  return {};
}

function errorDePorcentaje(datos: DatosFormularioPromocion): string | undefined {
  if (datos.tipo !== 'PORCENTAJE') return undefined;
  const valor = datos.descuento_porcentaje.trim();
  if (!valor) return 'El descuento es obligatorio.';
  if (!ENTERO_POSITIVO.test(valor) || Number(valor) < 1 || Number(valor) > 100) {
    return 'El descuento debe ser un número entero entre 1 y 100.';
  }
  return undefined;
}

function errorDePrecioFijo(datos: DatosFormularioPromocion): string | undefined {
  if (datos.tipo !== 'PRECIO_FIJO') return undefined;
  const valor = datos.precio_fijo.trim();
  if (!valor) return 'El precio fijo es obligatorio.';
  if (!PRECIO.test(valor) || Number(valor) <= 0) {
    return 'El precio fijo debe ser mayor que cero y tener hasta dos decimales.';
  }
  return undefined;
}

function errorDeCantidades(datos: DatosFormularioPromocion): ErroresPromocion {
  if (datos.tipo !== 'NXM') return {};
  const lleva = datos.cant_lleva.trim();
  const paga = datos.cant_paga.trim();
  if (!ENTERO_POSITIVO.test(lleva) || Number(lleva) <= 0) {
    return { cant_paga: 'La cantidad que lleva debe ser un entero mayor que cero.' };
  }
  if (!ENTERO_POSITIVO.test(paga) || Number(paga) <= 0) {
    return { cant_paga: 'La cantidad que paga debe ser un entero mayor que cero.' };
  }
  if (Number(paga) >= Number(lleva)) {
    return { cant_paga: 'La cantidad que paga debe ser menor que la cantidad que lleva.' };
  }
  return {};
}

function errorDelTipo(datos: DatosFormularioPromocion): ErroresPromocion {
  return {
    descuento_porcentaje: errorDePorcentaje(datos),
    precio_fijo: errorDePrecioFijo(datos),
    ...errorDeCantidades(datos),
  };
}

export function validarPromocion(datos: DatosFormularioPromocion): ErroresPromocion {
  const errores: ErroresPromocion = {
    nombre: validarNombre(datos.nombre),
    ...errorDeFecha(datos),
    ...errorDeHorario(datos),
    ...errorDelTipo(datos),
  };
  if (datos.producto_ids.length === 0) errores.producto_ids = 'Elegí al menos un producto.';
  if (datos.dias_semana.length === 0) errores.dias_semana = 'Elegí al menos un día.';
  if (datos.descripcion.length > 500) {
    errores.descripcion = 'La descripción supera los 500 caracteres permitidos.';
  }
  return Object.fromEntries(
    Object.entries(errores).filter(([, valor]) => valor !== undefined),
  ) as ErroresPromocion;
}

function esNombreRepetido(texto: string): boolean {
  return texto.includes('nombre') && (texto.includes('existe') || texto.includes('único'));
}

const CAMPOS_POR_MENSAJE: { claves: string[]; campo: keyof ErroresPromocion }[] = [
  { claves: ['producto'], campo: 'producto_ids' },
  { claves: ['fecha'], campo: 'fecha_hasta' },
  { claves: ['hora'], campo: 'hora_hasta' },
  { claves: ['día', 'dias'], campo: 'dias_semana' },
  { claves: ['porcentaje', 'descuento'], campo: 'descuento_porcentaje' },
  { claves: ['precio'], campo: 'precio_fijo' },
  { claves: ['paga', 'lleva'], campo: 'cant_paga' },
];

function campoDelMensaje(texto: string): keyof ErroresPromocion | undefined {
  return CAMPOS_POR_MENSAJE.find(({ claves }) => claves.some((clave) => texto.includes(clave)))
    ?.campo;
}

export function errorDelServidor(mensaje: string): ErroresPromocion {
  const texto = mensaje.toLocaleLowerCase();
  if (esNombreRepetido(texto)) {
    return { nombre: 'Ya existe una promoción con ese nombre.' };
  }
  const campo = campoDelMensaje(texto);
  return campo === undefined ? { general: mensaje } : { [campo]: mensaje };
}
