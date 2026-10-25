import { useState } from 'react';

import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import { crearSeccion } from '../api';
import type { ProductoSeleccionable } from '../types';

import { errorDelServidor, validarSeccion } from './validarSeccion';
import type { ErrorDelServidor } from './validarSeccion';

export interface OpcionesFormulario {
  productos: ProductoSeleccionable[];
  onCreada: () => void;
}

function descripcionDelTraslado(productos: ProductoSeleccionable[], ids: number[]): string {
  const detalle = productos
    .filter((producto) => ids.includes(producto.id))
    .map((producto) => `${producto.nombre} (sección ${producto.seccion.nombre})`)
    .join(', ');
  return `Cada producto pertenece a una sola sección. Se van a trasladar a la nueva: ${detalle}.`;
}

export function useFormularioSeccion({ productos, onCreada }: OpcionesFormulario) {
  const confirmar = useConfirm();
  const { mostrarToast } = useToast();
  const [nombre, setNombre] = useState('');
  const [orden, setOrden] = useState('');
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    const locales = validarSeccion({ nombre, orden });
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    const hayTraslado = seleccion.length > 0;
    if (hayTraslado) {
      const aceptado = await confirmar({
        titulo: 'Confirmar traslado de productos',
        descripcion: descripcionDelTraslado(productos, seleccion),
        textoConfirmar: 'Trasladar',
        textoCancelar: 'No trasladar',
      });
      if (!aceptado) return;
    }

    setEnviando(true);
    const respuesta = await crearSeccion({
      nombre: nombre.trim(),
      orden: Number(orden),
      producto_ids: seleccion,
      confirmar_traslado: hayTraslado,
    });
    setEnviando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: 'Sección creada', variante: 'success' });
      onCreada();
      return;
    }
    setErrores(errorDelServidor(respuesta.error ?? 'No se pudo crear la sección'));
  };

  return { nombre, setNombre, orden, setOrden, seleccion, setSeleccion, errores, enviando, enviar };
}
