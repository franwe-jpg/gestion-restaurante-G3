import type { FormEvent } from 'react';

import { Button } from '../../../shared/components/ui/button';
import type { ProductoSeleccionable, SeccionMenu } from '../types';

import { CamposMenuEjecutivo } from './CamposMenuEjecutivo';
import { useFormularioMenuEjecutivo } from './useFormularioMenuEjecutivo';

interface FormularioMenuEjecutivoProps {
  productos: ProductoSeleccionable[];
  secciones: SeccionMenu[];
  cargandoOpciones: boolean;
  errorCarga?: string;
  onCreado: () => void;
  onCancelar: () => void;
}

export function FormularioMenuEjecutivo({
  productos,
  secciones,
  cargandoOpciones,
  errorCarga,
  onCreado,
  onCancelar,
}: FormularioMenuEjecutivoProps) {
  const formulario = useFormularioMenuEjecutivo({ onCreado });

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    void formulario.enviar();
  }

  return (
    <form onSubmit={alEnviar} className="space-y-5">
      <CamposMenuEjecutivo
        datos={formulario.datos}
        errores={formulario.errores}
        productos={productos}
        secciones={secciones}
        onCambiar={formulario.actualizar}
      />
      {cargandoOpciones && <p role="status">Cargando productos y secciones…</p>}
      {errorCarga && (
        <p role="alert" className="text-sm text-danger">
          {errorCarga}
        </p>
      )}
      {formulario.errores.general && (
        <p role="alert" className="text-sm text-danger">
          {formulario.errores.general}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={formulario.enviando || cargandoOpciones || Boolean(errorCarga)}
        >
          {formulario.enviando ? 'Guardando…' : 'Guardar menú'}
        </Button>
      </div>
    </form>
  );
}
