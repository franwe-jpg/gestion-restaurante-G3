import { useState } from 'react';
import type { FormEvent } from 'react';

import { crearMenuDelDia, modificarMenuDelDia } from '../api';
import type { Estado, MenuDelDia, RespuestaMenu } from '../types';

import { normalizarPrecio, validarMenuDelDia } from './validarMenuDelDia';
import type { ErroresMenuDelDia, ValoresMenuDelDia } from './validarMenuDelDia';

export interface OpcionesFormulario {
  menu?: MenuDelDia;
  onGuardado: (menu: MenuDelDia) => void;
}

const VACIOS: ValoresMenuDelDia = {
  nombre: '',
  seccionId: null,
  precio: '',
  ingredientes: [],
  etiquetas: [],
  descripcion: '',
};

function valoresIniciales(menu?: MenuDelDia): ValoresMenuDelDia {
  if (menu === undefined) return VACIOS;
  return {
    nombre: menu.nombre,
    seccionId: menu.seccion.id,
    precio: menu.precio,
    ingredientes: menu.ingredientes,
    etiquetas: menu.etiquetas,
    descripcion: menu.descripcion ?? '',
  };
}

function datosDe(valores: ValoresMenuDelDia) {
  return {
    nombre: valores.nombre.trim(),
    seccion_id: valores.seccionId ?? 0,
    precio: normalizarPrecio(valores.precio) ?? '0',
    ingredientes: valores.ingredientes,
    etiquetas: valores.etiquetas,
    descripcion: valores.descripcion.trim() === '' ? null : valores.descripcion.trim(),
  };
}

interface Envio {
  menu?: MenuDelDia;
  campos: CamposMenuDelDia;
  onGuardado: (menu: MenuDelDia) => void;
}

function guardar({ menu, campos }: Envio): Promise<RespuestaMenu> {
  const datos = datosDe(campos.valores);
  if (menu === undefined) return crearMenuDelDia(datos, campos.imagen);
  return modificarMenuDelDia(
    menu.id,
    { ...datos, estado: campos.estado, quitar_imagen: campos.quitarImagen },
    campos.imagen,
  );
}

export interface CamposMenuDelDia {
  valores: ValoresMenuDelDia;
  imagen: File | null;
  quitarImagen: boolean;
  estado: Estado;
  cambiar: (cambio: Partial<ValoresMenuDelDia>) => void;
  cambiarImagen: (archivo: File | null) => void;
  quitarImagenActual: () => void;
  cambiarEstado: (estado: Estado) => void;
}

function useCampos(menu?: MenuDelDia): CamposMenuDelDia {
  const [valores, setValores] = useState<ValoresMenuDelDia>(() => valoresIniciales(menu));
  const [imagen, setImagen] = useState<File | null>(null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [estado, setEstado] = useState<Estado>(menu?.estado ?? 'HABILITADO');

  return {
    valores,
    imagen,
    quitarImagen,
    estado,
    cambiar: (cambio) => setValores((previo) => ({ ...previo, ...cambio })),
    cambiarImagen: (archivo) => {
      setImagen(archivo);
      if (archivo !== null) setQuitarImagen(false);
    },
    quitarImagenActual: () => {
      setImagen(null);
      setQuitarImagen(true);
    },
    cambiarEstado: setEstado,
  };
}

interface EstadoEnvio {
  errores: ErroresMenuDelDia;
  errorGeneral: string | null;
  enviando: boolean;
  enviar: (evento: FormEvent) => void;
}

function useEnvio({ menu, campos, onGuardado }: Envio): EstadoEnvio {
  const [errores, setErrores] = useState<ErroresMenuDelDia>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const manejarRespuesta = (respuesta: RespuestaMenu) => {
    if (respuesta.exito && respuesta.datos !== null) {
      onGuardado(respuesta.datos);
      return;
    }
    const mensaje = respuesta.error ?? 'No se pudo guardar el menú del día';
    if (mensaje.toLowerCase().includes('ya está registrado')) {
      setErrores({ nombre: mensaje });
      return;
    }
    setErrorGeneral(mensaje);
  };

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    const encontrados = validarMenuDelDia(campos.valores);
    setErrores(encontrados);
    setErrorGeneral(null);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    manejarRespuesta(await guardar({ menu, campos, onGuardado }));
    setEnviando(false);
  };

  return {
    errores,
    errorGeneral,
    enviando,
    enviar: (evento) => {
      void enviar(evento);
    },
  };
}

export type FormularioMenuDelDia = CamposMenuDelDia & EstadoEnvio;

/** Estado y envío del formulario de menú del día (alta y modificación). */
export function useFormularioMenuDelDia({
  menu,
  onGuardado,
}: OpcionesFormulario): FormularioMenuDelDia {
  const campos = useCampos(menu);
  const envio = useEnvio({ menu, campos, onGuardado });
  return { ...campos, ...envio };
}
