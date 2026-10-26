import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Textarea } from '../../../shared/components/ui/textarea';

import { useFormularioSector } from './useFormularioSector';

export interface SectorFormDialogProps {
  onCreado: () => void;
  onOpenChange: (abierto: boolean) => void;
}

/** Se monta solo mientras está abierto: cada apertura empieza con los campos vacíos. */
export function SectorFormDialog({ onCreado, onOpenChange }: SectorFormDialogProps) {
  const formulario = useFormularioSector({ onCreado });
  const { errores } = formulario;

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title="Nuevo sector"
      description="El estado del sector lo asigna el sistema."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void formulario.enviar()} disabled={formulario.enviando}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errores.general && <Alert variant="danger">{errores.general}</Alert>}
        <FormField id="sector-nombre" label="Nombre" required error={errores.nombre}>
          <Input
            id="sector-nombre"
            value={formulario.nombre}
            onChange={(evento) => formulario.setNombre(evento.target.value)}
          />
        </FormField>
        <FormField
          id="sector-descripcion"
          label="Descripción"
          hint="Opcional. Hasta 200 caracteres."
          error={errores.descripcion}
        >
          <Textarea
            id="sector-descripcion"
            value={formulario.descripcion}
            onChange={(evento) => formulario.setDescripcion(evento.target.value)}
          />
        </FormField>
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
          Estado: Habilitado
        </p>
      </div>
    </Dialog>
  );
}
