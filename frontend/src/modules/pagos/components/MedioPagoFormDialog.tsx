import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import { Dialog } from '../../../shared/components/ui/dialog';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { Textarea } from '../../../shared/components/ui/textarea';
import type { MedioPago, TipoMedioPago } from '../types';

import { useFormularioMedioPago } from './useFormularioMedioPago';
import { TIPOS_MEDIO_PAGO } from './validarMedioPago';

export interface MedioPagoFormDialogProps {
  medioPago?: MedioPago | null;
  onGuardado: () => void;
  onOpenChange: (abierto: boolean) => void;
}

type Formulario = ReturnType<typeof useFormularioMedioPago>;

function CampoEstado({ formulario, esEdicion }: { formulario: Formulario; esEdicion: boolean }) {
  if (!esEdicion) {
    return (
      <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
        Estado: Habilitado
      </p>
    );
  }
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <Checkbox
        checked={formulario.estado === 'HABILITADO'}
        onChange={(evento) =>
          formulario.setEstado(evento.target.checked ? 'HABILITADO' : 'DESHABILITADO')
        }
      />
      Habilitado
    </label>
  );
}

function CampoTipo({ formulario }: { formulario: Formulario }) {
  return (
    <FormField id="medio-pago-tipo" label="Tipo" required error={formulario.errores.tipo}>
      <Select
        id="medio-pago-tipo"
        value={formulario.tipo}
        onChange={(evento) => formulario.setTipo(evento.target.value as TipoMedioPago | '')}
      >
        <option value="">Elegí un tipo</option>
        {TIPOS_MEDIO_PAGO.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </Select>
    </FormField>
  );
}

function CamposMedioPago({
  formulario,
  esEdicion,
}: {
  formulario: Formulario;
  esEdicion: boolean;
}) {
  const { errores } = formulario;

  return (
    <div className="space-y-4">
      {errores.general && <Alert variant="danger">{errores.general}</Alert>}
      <FormField
        id="medio-pago-nombre"
        label="Nombre"
        required
        hint="De 3 a 50 caracteres. No se puede repetir."
        error={errores.nombre}
      >
        <Input
          id="medio-pago-nombre"
          value={formulario.nombre}
          onChange={(evento) => formulario.setNombre(evento.target.value)}
        />
      </FormField>
      <CampoTipo formulario={formulario} />
      <FormField
        id="medio-pago-descripcion"
        label="Descripción"
        hint="Opcional. Hasta 200 caracteres."
        error={errores.descripcion}
      >
        <Textarea
          id="medio-pago-descripcion"
          value={formulario.descripcion}
          onChange={(evento) => formulario.setDescripcion(evento.target.value)}
        />
      </FormField>
      <CampoEstado formulario={formulario} esEdicion={esEdicion} />
    </div>
  );
}

/** Se monta solo mientras está abierto: cada apertura parte de los datos del medio o vacía. */
export function MedioPagoFormDialog({
  medioPago = null,
  onGuardado,
  onOpenChange,
}: MedioPagoFormDialogProps) {
  const formulario = useFormularioMedioPago({ medioPago, onGuardado });
  const esEdicion = medioPago !== null;

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={esEdicion ? 'Editar medio de pago' : 'Nuevo medio de pago'}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void formulario.enviar()} disabled={formulario.enviando}>
            {esEdicion ? 'Guardar cambios' : 'Guardar'}
          </Button>
        </>
      }
    >
      <CamposMedioPago formulario={formulario} esEdicion={esEdicion} />
    </Dialog>
  );
}
