import { useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import { crearProducto } from '../api';
import { CONFIGURACIONES } from '../categorias';
import type { CategoriaAlta } from '../categorias';

import { convertirPrecio, errorDelServidor, validarProducto } from './validarProducto';
import type { ErrorDelServidor } from './validarProducto';

export interface OpcionesFormularioProducto {
  categoria: CategoriaAlta;
  onCreado: () => void;
}

function useCampos() {
  const [nombre, setNombre] = useState('');
  const [seccionId, setSeccionId] = useState('');
  const [precio, setPrecio] = useState('');
  const [ingredientes, setIngredientes] = useState<string[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
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

export function useFormularioProducto({ categoria, onCreado }: OpcionesFormularioProducto) {
  const configuracion = CONFIGURACIONES[categoria];
  const { mostrarToast } = useToast();
  const campos = useCampos();
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (enviando) return;
    const locales = validarProducto(campos, configuracion);
    setErrores(locales);
    const precio = convertirPrecio(campos.precio);
    if (Object.keys(locales).length > 0 || precio === null) return;

    setEnviando(true);
    const respuesta = await crearProducto(
      categoria,
      {
        nombre: campos.nombre.trim(),
        seccion_id: Number(campos.seccionId),
        precio,
        ingredientes: campos.ingredientes,
        descripcion: campos.descripcion.trim() || null,
        etiquetas: campos.etiquetas,
      },
      campos.imagen,
    );
    setEnviando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: configuracion.creado, variante: 'success' });
      onCreado();
      return;
    }
    setErrores(errorDelServidor(respuesta.error ?? configuracion.errorAlCrear, configuracion));
  };

  return { ...campos, errores, enviando, enviar };
}
