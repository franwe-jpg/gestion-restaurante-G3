import type { FormEvent } from 'react';

import { Button } from '../../../shared/components/ui/button';
import type { Estado, MenuEjecutivo, ProductoMenu, SeccionMenu } from '../types';

import { CamposMenuEjecutivo } from './CamposMenuEjecutivo';
import { useFormularioMenuEjecutivo } from './useFormularioMenuEjecutivo';

interface FormularioMenuEjecutivoProps {
  menu?: MenuEjecutivo | null;
  productos: ProductoMenu[];
  secciones: SeccionMenu[];
  cargandoOpciones: boolean;
  errorCarga?: string;
  onGuardado: () => void;
  onCancelar: () => void;
}

interface MensajesFormularioProps {
  cargandoOpciones: boolean;
  errorCarga?: string;
  general?: string;
}

function MensajesFormulario({ cargandoOpciones, errorCarga, general }: MensajesFormularioProps) {
  return (
    <>
      {cargandoOpciones && <p role="status">Cargando productos y secciones…</p>}
      {errorCarga && (
        <p role="alert" className="text-sm text-danger">
          {errorCarga}
        </p>
      )}
      {general && (
        <p role="alert" className="text-sm text-danger">
          {general}
        </p>
      )}
    </>
  );
}

interface AccionesFormularioProps {
  enviando: boolean;
  deshabilitado: boolean;
  editando: boolean;
  onCancelar: () => void;
}

function AccionesFormulario({
  enviando,
  deshabilitado,
  editando,
  onCancelar,
}: AccionesFormularioProps) {
  const etiqueta = editando ? 'Guardar cambios' : 'Guardar menú';
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancelar}>
        Cancelar
      </Button>
      <Button type="submit" disabled={enviando || deshabilitado}>
        {enviando ? 'Guardando…' : etiqueta}
      </Button>
    </div>
  );
}

export function FormularioMenuEjecutivo({
  menu,
  productos,
  secciones,
  cargandoOpciones,
  errorCarga,
  onGuardado,
  onCancelar,
}: FormularioMenuEjecutivoProps) {
  const formulario = useFormularioMenuEjecutivo({ menu, onGuardado });
  const editando = Boolean(menu);

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
        estado={formulario.estado}
        onCambiar={formulario.actualizar}
        onCambiarEstado={(nuevoEstado: Estado) => formulario.cambiarEstado(nuevoEstado)}
        editando={editando}
      />
      <MensajesFormulario
        cargandoOpciones={cargandoOpciones}
        errorCarga={errorCarga}
        general={formulario.errores.general}
      />
      <AccionesFormulario
        enviando={formulario.enviando}
        deshabilitado={cargandoOpciones || Boolean(errorCarga)}
        editando={editando}
        onCancelar={onCancelar}
      />
    </form>
  );
}
