import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import type { ProductoSeleccionable, SeccionListado } from '../types';

import { SelectorProductos } from './SelectorProductos';
import { AVISO_PRODUCTO_ACTUAL, useFormularioSeccion } from './useFormularioSeccion';

export interface SeccionFormDialogProps {
  productos: ProductoSeleccionable[];
  /** Con `seccion` el diálogo edita esa fila; sin ella, crea una sección. */
  seccion?: SeccionListado;
  onGuardada: () => void;
  onOpenChange: (abierto: boolean) => void;
}

function CasillaHabilitar({
  marcada,
  onCambiar,
}: {
  marcada: boolean;
  onCambiar: (marcada: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-700">
      <Checkbox
        id="seccion-habilitar"
        checked={marcada}
        onChange={(evento) => onCambiar(evento.target.checked)}
      />
      <label htmlFor="seccion-habilitar">Habilitar la sección</label>
    </div>
  );
}

interface PieDelDialogoProps {
  enviando: boolean;
  onCancelar: () => void;
  onGuardar: () => void;
}

function PieDelDialogo({ enviando, onCancelar, onGuardar }: PieDelDialogoProps) {
  return (
    <>
      <Button variant="outline" onClick={onCancelar}>
        Cancelar
      </Button>
      <Button onClick={onGuardar} disabled={enviando}>
        Guardar
      </Button>
    </>
  );
}

type Formulario = ReturnType<typeof useFormularioSeccion>;

function CamposDeLaSeccion({ formulario }: { formulario: Formulario }) {
  const { errores } = formulario;
  return (
    <>
      <FormField id="seccion-nombre" label="Nombre" required error={errores.nombre}>
        <Input
          id="seccion-nombre"
          value={formulario.nombre}
          onChange={(evento) => formulario.setNombre(evento.target.value)}
        />
      </FormField>
      <FormField id="seccion-orden" label="Orden" required error={errores.orden}>
        <Input
          id="seccion-orden"
          inputMode="numeric"
          value={formulario.orden}
          onChange={(evento) => formulario.setOrden(evento.target.value)}
        />
      </FormField>
    </>
  );
}

interface ProductosDeLaSeccionProps {
  productos: ProductoSeleccionable[];
  seleccion: number[];
  aviso: boolean;
  onCambiar: (ids: number[]) => void;
}

function ProductosDeLaSeccion({
  productos,
  seleccion,
  aviso,
  onCambiar,
}: ProductosDeLaSeccionProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-slate-700">Productos (opcional)</p>
      {aviso && <Alert variant="warning">{AVISO_PRODUCTO_ACTUAL}</Alert>}
      <SelectorProductos productos={productos} seleccionados={seleccion} onCambiar={onCambiar} />
    </div>
  );
}

/** Se monta solo mientras está abierto: cada apertura parte de la fila (o de campos vacíos). */
export function SeccionFormDialog({
  productos,
  seccion,
  onGuardada,
  onOpenChange,
}: SeccionFormDialogProps) {
  const formulario = useFormularioSeccion({ productos, seccion, onGuardada });
  const { errores } = formulario;

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={seccion ? 'Editar sección' : 'Nueva sección'}
      description="El orden define cómo aparecen las secciones en la carta."
      footer={
        <PieDelDialogo
          enviando={formulario.enviando}
          onCancelar={() => onOpenChange(false)}
          onGuardar={() => void formulario.enviar()}
        />
      }
    >
      <div className="space-y-4">
        {errores.general && <Alert variant="danger">{errores.general}</Alert>}
        <CamposDeLaSeccion formulario={formulario} />
        <ProductosDeLaSeccion
          productos={productos}
          seleccion={formulario.seleccion}
          aviso={formulario.avisoActual}
          onCambiar={formulario.cambiarSeleccion}
        />
        {seccion?.estado === 'DESHABILITADO' && (
          <CasillaHabilitar marcada={formulario.habilitar} onCambiar={formulario.setHabilitar} />
        )}
      </div>
    </Dialog>
  );
}
