import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Si la URL trae `?<parametro>=1`, llama a `abrir` una vez y quita solo ese parámetro con
 * `replace`: no agrega una entrada al historial ni pierde otros parámetros (por ejemplo `?mesa=`).
 */
export function useAbrirDesdeUrl(parametro: string, abrir: () => void): void {
  const [parametros, setParametros] = useSearchParams();
  const abrirRef = useRef(abrir);

  useEffect(() => {
    abrirRef.current = abrir;
  });

  const valor = parametros.get(parametro);
  useEffect(() => {
    if (valor !== '1') return;
    abrirRef.current();
    setParametros(
      (previos) => {
        const nuevos = new URLSearchParams(previos);
        nuevos.delete(parametro);
        return nuevos;
      },
      { replace: true },
    );
  }, [valor, parametro, setParametros]);
}
