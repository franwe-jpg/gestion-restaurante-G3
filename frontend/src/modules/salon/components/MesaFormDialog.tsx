import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { Spinner } from '../../../shared/components/ui/spinner';
import type { Mesa } from '../types';

import { useFormularioMesa } from './useFormularioMesa';

export interface MesaFormDialogProps {
  mesa?: Mesa | null;
  onGuardado: () => void;
  onOpenChange: (abierto: boolean) => void;
  onCrearSector?: () => void;
}

function AvisoSinSectores({ onCrearSector }: { onCrearSector?: () => void }) {
  return (
    <Alert variant="warning" titulo="Primero creá un sector">
      Necesitás al menos un sector habilitado para crear una mesa.
      {onCrearSector && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onCrearSector}>
          Crear sector
        </Button>
      )}
    </Alert>
  );
}

type Formulario = ReturnType<typeof useFormularioMesa>;

function CamposNumericos({ formulario }: { formulario: Formulario }) {
  const { errores } = formulario;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="mesa-numero" label="Número" required error={errores.numero}>
        <Input
          id="mesa-numero"
          inputMode="numeric"
          value={formulario.numero}
          onChange={(evento) => formulario.setNumero(evento.target.value)}
        />
      </FormField>
      <FormField id="mesa-capacidad" label="Capacidad" required error={errores.capacidad}>
        <Input
          id="mesa-capacidad"
          inputMode="numeric"
          value={formulario.capacidad}
          onChange={(evento) => formulario.setCapacidad(evento.target.value)}
        />
      </FormField>
    </div>
  );
}

interface CamposMesaProps {
  formulario: Formulario;
  sinSectores: boolean;
  esEdicion: boolean;
  onCrearSector?: () => void;
}

function CamposMesa({ formulario, sinSectores, esEdicion, onCrearSector }: CamposMesaProps) {
  const { errores } = formulario;

  return (
    <div className="space-y-4">
      {formulario.errorDeCarga && <Alert variant="danger">{formulario.errorDeCarga}</Alert>}
      {!formulario.errorDeCarga && sinSectores && (
        <AvisoSinSectores onCrearSector={onCrearSector} />
      )}
      {errores.general && <Alert variant="danger">{errores.general}</Alert>}
      <FormField
        id="mesa-sector"
        label="Sector"
        required
        hint="Solo sectores habilitados."
        error={errores.sectorId}
      >
        <Select
          id="mesa-sector"
          value={formulario.sectorId}
          onChange={(evento) => formulario.setSectorId(evento.target.value)}
        >
          <option value="">Seleccione un sector</option>
          {formulario.sectores.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.nombre}
            </option>
          ))}
        </Select>
      </FormField>
      <CamposNumericos formulario={formulario} />
      {!esEdicion && !sinSectores && (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
          La mesa se crea en estado <strong>Libre</strong>.
        </p>
      )}
    </div>
  );
}

/** Se monta solo mientras está abierto: cada apertura parte de los datos de la mesa o vacía. */
export function MesaFormDialog({
  mesa = null,
  onGuardado,
  onOpenChange,
  onCrearSector,
}: MesaFormDialogProps) {
  const formulario = useFormularioMesa({ mesa, onGuardado });
  const sinSectores = !formulario.cargandoSectores && formulario.sectores.length === 0;
  const esEdicion = mesa !== null;

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={esEdicion ? 'Editar mesa' : 'Nueva mesa'}
      description="El estado de la mesa lo asigna el sistema."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => void formulario.enviar()}
            disabled={formulario.enviando || sinSectores}
          >
            {esEdicion ? 'Guardar cambios' : 'Guardar mesa'}
          </Button>
        </>
      }
    >
      {formulario.cargandoSectores ? (
        <Spinner etiqueta="Cargando sectores..." />
      ) : (
        <CamposMesa
          formulario={formulario}
          sinSectores={sinSectores}
          esEdicion={esEdicion}
          onCrearSector={onCrearSector}
        />
      )}
    </Dialog>
  );
}
