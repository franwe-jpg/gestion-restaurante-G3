export interface DatosFormularioMenuEjecutivo {
  nombre: string;
  precio_fijo: string;
  producto_ids: number[];
  seccion_id: string;
  descripcion: string;
}

export interface ErroresMenuEjecutivo {
  nombre?: string;
  precio_fijo?: string;
  producto_ids?: string;
  seccion_id?: string;
  descripcion?: string;
  general?: string;
}

function validarNombre(nombreIngresado: string): string | undefined {
  const nombre = nombreIngresado.trim();
  if (!nombre) return 'El nombre es obligatorio.';
  if (nombre.length > 100) return 'El nombre supera los 100 caracteres permitidos.';
  return undefined;
}

function validarPrecio(precioIngresado: string): string | undefined {
  const precio = precioIngresado.trim();
  if (!precio || Number(precio) <= 0 || !Number.isFinite(Number(precio))) {
    return 'El precio fijo debe ser mayor que cero.';
  }
  if (!/^\d+(\.\d{1,2})?$/.test(precio)) return 'El precio admite hasta dos decimales.';
  return undefined;
}

export function validarMenuEjecutivo(datos: DatosFormularioMenuEjecutivo): ErroresMenuEjecutivo {
  const errores: ErroresMenuEjecutivo = {};
  const nombre = validarNombre(datos.nombre);
  const precio = validarPrecio(datos.precio_fijo);

  if (nombre) errores.nombre = nombre;
  if (precio) errores.precio_fijo = precio;
  if (datos.producto_ids.length === 0) errores.producto_ids = 'Incluí al menos un producto.';
  if (!datos.seccion_id || Number(datos.seccion_id) <= 0) {
    errores.seccion_id = 'Elegí una sección habilitada.';
  }
  if (datos.descripcion.length > 500) {
    errores.descripcion = 'La descripción supera los 500 caracteres permitidos.';
  }
  return errores;
}

export function errorDelServidor(mensaje: string): ErroresMenuEjecutivo {
  const texto = mensaje.toLocaleLowerCase();
  if (texto.includes('nombre') && (texto.includes('existe') || texto.includes('único'))) {
    return { nombre: 'Ya existe un menú ejecutivo con ese nombre.' };
  }
  if (
    texto.includes('producto') ||
    texto.includes('menú del día') ||
    texto.includes('habilitados')
  ) {
    return { producto_ids: mensaje };
  }
  if (texto.includes('sección')) return { seccion_id: mensaje };
  return { general: mensaje };
}
