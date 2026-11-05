import type { FormEvent } from 'react';

import { Button } from '../../../shared/components/ui/button';
import type { ProductoMenu, Promocion } from '../types';

import { CamposPromocion } from './CamposPromocion';
import { useFormularioPromocion } from './useFormularioPromocion';

interface FormularioPromocionProps {
  promocion?: Promocion | null;
  productos: ProductoMenu[];
  cargandoProductos: boolean;
  errorProductos?: string;
  onGuardado: () => void;
  onCancelar: () => void;
}

export function FormularioPromocion({
  promocion,
  productos,
  cargandoProductos,
  errorProductos,
  onGuardado,
  onCancelar,
}: FormularioPromocionProps) {
  const formulario = useFormularioPromocion({ promocion, onGuardado });

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    void formulario.enviar();
  }

  return (
    <form onSubmit={alEnviar} className="space-y-5">
      <CamposPromocion
        datos={formulario.datos}
        errores={formulario.errores}
        productos={productos}
        onCambiar={formulario.cambiar}
        onCambiarTipo={formulario.cambiarTipo}
      />
      {cargandoProductos && <p role="status">Cargando productos…</p>}
      {errorProductos && (
        <p role="alert" className="text-sm text-danger">
          {errorProductos}
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
        <Button type="submit" disabled={formulario.enviando || Boolean(errorProductos)}>
          {formulario.enviando
            ? 'Guardando…'
            : formulario.editando
              ? 'Guardar cambios'
              : 'Guardar promoción'}
        </Button>
      </div>
    </form>
  );
}
