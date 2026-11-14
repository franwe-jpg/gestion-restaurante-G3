import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { Switch } from '../../../shared/components/ui/switch';
import type { MenuDelDia, SeccionResumen } from '../types';

import { CampoImagenMenu } from './CampoImagenMenu';
import { CamposBasicosMenu } from './CamposBasicosMenu';
import { CamposTextosMenu } from './CamposTextosMenu';
import { useFormularioMenuDelDia } from './useFormularioMenuDelDia';

export const ID_FORMULARIO_MENU_DEL_DIA = 'formulario-menu-del-dia';

export interface FormularioMenuDelDiaProps {
  formulario: ReturnType<typeof useFormularioMenuDelDia>;
  secciones: SeccionResumen[];
  menu?: MenuDelDia;
  titulo: string;
}

/** Campos del alta y la modificación del menú del día (HU-M2-04 y 05). */
export function FormularioMenuDelDia({
  formulario,
  secciones,
  menu,
  titulo,
}: FormularioMenuDelDiaProps) {
  const esAlta = menu === undefined;

  return (
    <form
      id={ID_FORMULARIO_MENU_DEL_DIA}
      onSubmit={formulario.enviar}
      className="space-y-4"
      aria-label={titulo}
    >
      <CamposBasicosMenu formulario={formulario} secciones={secciones} />
      <CamposTextosMenu formulario={formulario} />
      <CampoImagenMenu formulario={formulario} menu={menu} />
      {!esAlta && (
        <div className="flex items-center gap-2">
          <Switch
            checked={formulario.estado === 'HABILITADO'}
            onCheckedChange={(habilitado) =>
              formulario.cambiarEstado(habilitado ? 'HABILITADO' : 'DESHABILITADO')
            }
            aria-label="Habilitado"
          />
          <span className="text-sm font-medium text-slate-700">Habilitado</span>
        </div>
      )}

      {formulario.errorGeneral !== null && (
        <Alert variant="danger">{formulario.errorGeneral}</Alert>
      )}
    </form>
  );
}

interface PieDelDialogoProps {
  esAlta: boolean;
  enviando: boolean;
  deshabilitado: boolean;
  onCancelar: () => void;
}

function PieDelDialogo({ esAlta, enviando, deshabilitado, onCancelar }: PieDelDialogoProps) {
  return (
    <>
      <Button variant="brand-outline" onClick={onCancelar}>
        Cancelar
      </Button>
      <Button type="submit" form={ID_FORMULARIO_MENU_DEL_DIA} disabled={enviando || deshabilitado}>
        {esAlta ? 'Guardar menú' : 'Guardar cambios'}
      </Button>
    </>
  );
}

export interface DialogoMenuDelDiaProps {
  secciones: SeccionResumen[];
  /** Con `menu` el diálogo lo modifica; sin él, crea uno nuevo. */
  menu?: MenuDelDia;
  onGuardado: (menu: MenuDelDia) => void;
  onOpenChange: (abierto: boolean) => void;
}

/** Se monta solo mientras está abierto: cada apertura parte de la fila o de campos vacíos. */
export function DialogoMenuDelDia({
  secciones,
  menu,
  onGuardado,
  onOpenChange,
}: DialogoMenuDelDiaProps) {
  const formulario = useFormularioMenuDelDia({ menu, onGuardado });
  const esAlta = menu === undefined;
  const titulo = esAlta ? 'Nuevo menú del día' : 'Modificar menú del día';
  const sinSecciones = secciones.length === 0;

  return (
    <Dialog
      open
      size="lg"
      onOpenChange={onOpenChange}
      title={titulo}
      description={
        esAlta
          ? 'Completá los datos del menú que se ofrece en la carta.'
          : 'Actualizá los datos o el estado del menú del día.'
      }
      footer={
        <PieDelDialogo
          esAlta={esAlta}
          enviando={formulario.enviando}
          deshabilitado={sinSecciones}
          onCancelar={() => onOpenChange(false)}
        />
      }
    >
      <div className="-mx-1 max-h-[65vh] overflow-y-auto px-1">
        {sinSecciones ? (
          <Alert variant="warning">
            No hay secciones habilitadas. Creá una sección en Productos antes de cargar un menú del
            día.
          </Alert>
        ) : (
          <FormularioMenuDelDia
            formulario={formulario}
            secciones={secciones}
            menu={menu}
            titulo={titulo}
          />
        )}
      </div>
    </Dialog>
  );
}
