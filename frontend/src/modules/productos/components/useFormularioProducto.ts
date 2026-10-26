import { useState } from 'react';

import type { RespuestaApi } from '../../../shared/types';
import { crearProducto } from '../api';
import { CONFIGURACIONES } from '../categorias';
import type { CategoriaAlta, ConfiguracionAlta } from '../categorias';
import type { ProductoCrear, ProductoSalida } from '../types';

import { useToast } from '../../../shared/hooks/useToast';

import { convertirPrecio, errorDelServidor, validarProducto } from './validarProducto';
import type { ErrorDelServidor } from './validarProducto';

export interface OpcionesFormularioProducto {
  categoria: CategoriaAlta;
  onCreado: () => void;
}

export interface CamposIniciales {
  nombre: string;
  seccionId: string;
  precio: string;
  ingredientes: string[];
  descripcion: string;
  etiquetas: string[];
}

export type Campos = ReturnType<typeof useCampos>;

export function useCampos(inicial: Partial<CamposIniciales> = {}) {
  const [nombre, setNombre] = useState(inicial.nombre ?? '');
  const [seccionId, setSeccionId] = useState(inicial.seccionId ?? '');
  const [precio, setPrecio] = useState(inicial.precio ?? '');
  const [ingredientes, setIngredientes] = useState<string[]>(inicial.ingredientes ?? []);
  const [descripcion, setDescripcion] = useState(inicial.descripcion ?? '');
  const [etiquetas, setEtiquetas] = useState<string[]>(inicial.etiquetas ?? []);
  const [imagen, setImagen] = useState<File | null>(null);

  return {
    nombre,
    setNombre,
    seccionId,
    setSeccionId,
    precio,
    setPrecio,
    ingredientes,
    setIngredientes,
    descripcion,
    setDescripcion,
    etiquetas,
    setEtiquetas,
    imagen,
    setImagen,
  };
}

export interface OpcionesEnvioProducto {
  campos: Campos;
  validacion: Pick<ConfiguracionAlta, 'ingredientesObligatorios' | 'nombreRepetido'>;
  guardar: (datos: ProductoCrear) => Promise<RespuestaApi<ProductoSalida>>;
  exito: string;
  errorPorDefecto: string;
  onExito: () => void;
}

/** Valida, arma los datos del formulario, los guarda y ubica los errores del servidor. */
export function useEnvioProducto({
  campos,
  validacion,
  guardar,
  exito,
  errorPorDefecto,
  onExito,
}: OpcionesEnvioProducto) {
  const { mostrarToast } = useToast();
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (enviando) return;
    const locales = validarProducto(campos, validacion);
    setErrores(locales);
    const precio = convertirPrecio(campos.precio);
    if (Object.keys(locales).length > 0 || precio === null) return;

    setEnviando(true);
    const respuesta = await guardar({
      nombre: campos.nombre.trim(),
      seccion_id: Number(campos.seccionId),
      precio,
      ingredientes: campos.ingredientes,
      descripcion: campos.descripcion.trim() || null,
      etiquetas: campos.etiquetas,
    });
    setEnviando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: exito, variante: 'success' });
      onExito();
      return;
    }
    setErrores(errorDelServidor(respuesta.error ?? errorPorDefecto, validacion));
  };

  return { errores, enviando, enviar };
}

export function useFormularioProducto({ categoria, onCreado }: OpcionesFormularioProducto) {
  const configuracion = CONFIGURACIONES[categoria];
  const campos = useCampos();
  const envio = useEnvioProducto({
    campos,
    validacion: configuracion,
    guardar: (datos) => crearProducto(categoria, datos, campos.imagen),
    exito: configuracion.creado,
    errorPorDefecto: configuracion.errorAlCrear,
    onExito: onCreado,
  });

  return { ...campos, ...envio };
}
