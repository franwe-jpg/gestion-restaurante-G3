import { useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import { crearPlato } from '../api';

import { convertirPrecio, errorDelServidor, validarPlato } from './validarPlato';
import type { ErrorDelServidor } from './validarPlato';

export interface OpcionesFormularioPlato {
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

export function useFormularioPlato({ onCreado }: OpcionesFormularioPlato) {
  const { mostrarToast } = useToast();
  const campos = useCampos();
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (enviando) return;
    const locales = validarPlato(campos);
    setErrores(locales);
    const precio = convertirPrecio(campos.precio);
    if (Object.keys(locales).length > 0 || precio === null) return;

    setEnviando(true);
    const respuesta = await crearPlato(
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
      mostrarToast({ titulo: 'Plato creado', variante: 'success' });
      onCreado();
      return;
    }
    setErrores(errorDelServidor(respuesta.error ?? 'No se pudo crear el plato'));
  };

  return { ...campos, errores, enviando, enviar };
}
