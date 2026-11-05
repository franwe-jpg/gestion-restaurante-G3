import { useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import { crearPromocion, modificarPromocion } from '../api';
import type { Promocion, PromocionCrear, TipoPromocion } from '../types';

import { errorDelServidor, validarPromocion } from './validarPromocion';
import type { DatosFormularioPromocion, ErroresPromocion } from './validarPromocion';

const INICIAL: DatosFormularioPromocion = {
  nombre: '',
  tipo: 'PORCENTAJE',
  descripcion: '',
  producto_ids: [],
  fecha_desde: '',
  fecha_hasta: '',
  dias_semana: [],
  hora_desde: '',
  hora_hasta: '',
  descuento_porcentaje: '',
  precio_fijo: '',
  cant_lleva: '',
  cant_paga: '',
};

interface OpcionesFormulario {
  promocion?: Promocion | null;
  onGuardado: () => void;
}

function comoTexto(valor: number | null): string {
  return valor === null ? '' : String(valor);
}

function datosIniciales(promocion?: Promocion | null): DatosFormularioPromocion {
  if (!promocion) return INICIAL;
  return {
    nombre: promocion.nombre,
    tipo: promocion.tipo,
    descripcion: promocion.descripcion ?? '',
    producto_ids: promocion.productos.map((producto) => producto.id),
    fecha_desde: promocion.fecha_desde,
    fecha_hasta: promocion.fecha_hasta,
    dias_semana: promocion.dias_semana,
    hora_desde: promocion.hora_desde ?? '',
    hora_hasta: promocion.hora_hasta ?? '',
    descuento_porcentaje: comoTexto(promocion.descuento_porcentaje),
    precio_fijo: promocion.precio_fijo ?? '',
    cant_lleva: comoTexto(promocion.cant_lleva),
    cant_paga: comoTexto(promocion.cant_paga),
  };
}

function conTipo(datos: DatosFormularioPromocion, tipo: TipoPromocion): DatosFormularioPromocion {
  return {
    ...datos,
    tipo,
    descuento_porcentaje: '',
    precio_fijo: '',
    cant_lleva: '',
    cant_paga: '',
  };
}

function datosDeEnvio(datos: DatosFormularioPromocion): PromocionCrear {
  return {
    nombre: datos.nombre.trim(),
    tipo: datos.tipo,
    descripcion: datos.descripcion.trim() || null,
    producto_ids: datos.producto_ids,
    fecha_desde: datos.fecha_desde,
    fecha_hasta: datos.fecha_hasta,
    dias_semana: datos.dias_semana,
    hora_desde: datos.hora_desde.trim() || null,
    hora_hasta: datos.hora_hasta.trim() || null,
    descuento_porcentaje: datos.tipo === 'PORCENTAJE' ? Number(datos.descuento_porcentaje) : null,
    precio_fijo: datos.tipo === 'PRECIO_FIJO' ? datos.precio_fijo.trim() : null,
    cant_lleva: datos.tipo === 'NXM' ? Number(datos.cant_lleva) : null,
    cant_paga: datos.tipo === 'NXM' ? Number(datos.cant_paga) : null,
  };
}

function mensajeDeError(editando: boolean): string {
  return editando ? 'No se pudo actualizar la promoción' : 'No se pudo crear la promoción';
}

export function useFormularioPromocion({ promocion, onGuardado }: OpcionesFormulario) {
  const [datos, setDatos] = useState<DatosFormularioPromocion>(() => datosIniciales(promocion));
  const [errores, setErrores] = useState<ErroresPromocion>({});
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();
  const editando = Boolean(promocion);

  function cambiar<K extends keyof DatosFormularioPromocion>(
    campo: K,
    valor: DatosFormularioPromocion[K],
  ) {
    setDatos((actuales) => ({ ...actuales, [campo]: valor }));
  }

  function cambiarTipo(tipo: TipoPromocion) {
    setDatos((actuales) => conTipo(actuales, tipo));
  }

  async function enviar() {
    const fallas = validarPromocion(datos);
    setErrores(fallas);
    if (Object.keys(fallas).length > 0) return;

    setEnviando(true);
    try {
      const cuerpo = datosDeEnvio(datos);
      const respuesta = promocion
        ? await modificarPromocion(promocion.id, cuerpo)
        : await crearPromocion(cuerpo);
      if (!respuesta.exito) {
        setErrores(errorDelServidor(respuesta.error ?? mensajeDeError(editando)));
        return;
      }
      mostrarToast({
        titulo: editando ? 'Promoción actualizada' : 'Promoción creada',
        variante: 'success',
      });
      setDatos(INICIAL);
      setErrores({});
      onGuardado();
    } finally {
      setEnviando(false);
    }
  }

  return {
    datos,
    errores,
    enviando,
    editando,
    cambiar,
    cambiarTipo,
    enviar,
  };
}
