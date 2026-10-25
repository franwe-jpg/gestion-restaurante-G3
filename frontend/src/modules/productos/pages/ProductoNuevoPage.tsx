import { Link, useNavigate } from 'react-router-dom';

import { PageHeader } from '../../../shared/components/PageHeader';
import { Alert } from '../../../shared/components/ui/alert';
import { Breadcrumbs } from '../../../shared/components/ui/breadcrumbs';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { Spinner } from '../../../shared/components/ui/spinner';
import { Textarea } from '../../../shared/components/ui/textarea';
import { useApi } from '../../../shared/hooks/useApi';
import { listarSeccionesHabilitadas } from '../api';
import { ListaDeTextos } from '../components/ListaDeTextos';
import { SelectorImagen } from '../components/SelectorImagen';
import { useFormularioPlato } from '../components/useFormularioPlato';
import {
  DESCRIPCION_MAXIMA,
  ETIQUETA_MAXIMA,
  ETIQUETAS_TOPE,
  INGREDIENTE_MAXIMO,
  INGREDIENTES_TOPE,
} from '../components/validarPlato';
import type { SeccionListado } from '../types';

type Formulario = ReturnType<typeof useFormularioPlato>;

const MIGAS = [{ etiqueta: 'Productos y Carta', ruta: '/productos' }, { etiqueta: 'Nuevo plato' }];

function CamposPrincipales({ f, secciones }: { f: Formulario; secciones: SeccionListado[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="plato-nombre" label="Nombre" required error={f.errores.nombre}>
        <Input
          id="plato-nombre"
          value={f.nombre}
          onChange={(evento) => f.setNombre(evento.target.value)}
        />
      </FormField>
      <FormField id="plato-seccion" label="Sección" required error={f.errores.seccionId}>
        <Select
          id="plato-seccion"
          value={f.seccionId}
          onChange={(evento) => f.setSeccionId(evento.target.value)}
        >
          <option value="">Seleccione una sección</option>
          {secciones.map((seccion) => (
            <option key={seccion.id} value={seccion.id}>
              {seccion.nombre}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField id="plato-precio" label="Precio" required error={f.errores.precio}>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-sm text-slate-600">$</span>
          <Input
            id="plato-precio"
            inputMode="decimal"
            placeholder="12.500,00"
            className="pl-7"
            value={f.precio}
            onChange={(evento) => f.setPrecio(evento.target.value)}
          />
        </div>
      </FormField>
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Estado</span>
        <p className="flex min-h-9 items-center text-sm font-medium text-slate-900">Habilitado</p>
      </div>
    </div>
  );
}

function CamposDeTexto({ f }: { f: Formulario }) {
  return (
    <>
      <ListaDeTextos
        id="plato-ingredientes"
        etiqueta="Ingredientes"
        singular="ingrediente"
        plural="ingredientes"
        valores={f.ingredientes}
        onCambiar={f.setIngredientes}
        tope={INGREDIENTES_TOPE}
        maximoPorTexto={INGREDIENTE_MAXIMO}
        placeholder="Escriba un ingrediente y presione Enter"
        required
        error={f.errores.ingredientes}
      />
      <FormField id="plato-descripcion" label="Descripción" error={f.errores.descripcion}>
        <Textarea
          id="plato-descripcion"
          rows={3}
          value={f.descripcion}
          onChange={(evento) => f.setDescripcion(evento.target.value)}
        />
        <p className="text-right text-xs text-slate-500">
          {f.descripcion.length} / {DESCRIPCION_MAXIMA}
        </p>
      </FormField>
      <ListaDeTextos
        id="plato-etiquetas"
        etiqueta="Etiquetas"
        singular="etiqueta"
        plural="etiquetas"
        valores={f.etiquetas}
        onCambiar={f.setEtiquetas}
        tope={ETIQUETAS_TOPE}
        maximoPorTexto={ETIQUETA_MAXIMA}
        placeholder="Por ejemplo: Vegano, Sin TACC"
      />
    </>
  );
}

function AvisoSinSecciones() {
  return (
    <Alert variant="warning" titulo="Primero hay que crear una sección">
      El plato necesita una sección habilitada.{' '}
      <Link to="/productos?pestania=secciones" className="font-medium underline">
        Ir a Secciones
      </Link>
    </Alert>
  );
}

interface FormularioPlatoProps {
  f: Formulario;
  secciones: SeccionListado[];
  errorDeCarga: string | null;
}

function FormularioPlato({ f, secciones, errorDeCarga }: FormularioPlatoProps) {
  const navigate = useNavigate();
  const sinSecciones = secciones.length === 0;

  return (
    <form
      noValidate
      className="flex flex-wrap items-start gap-5"
      onSubmit={(evento) => {
        evento.preventDefault();
        void f.enviar();
      }}
    >
      <Card className="min-w-0 flex-[999_1_480px]">
        <CardContent className="space-y-5 pt-6">
          {errorDeCarga && <Alert variant="danger">{errorDeCarga}</Alert>}
          {!errorDeCarga && sinSecciones && <AvisoSinSecciones />}
          {f.errores.general && <Alert variant="danger">{f.errores.general}</Alert>}
          <CamposPrincipales f={f} secciones={secciones} />
          <CamposDeTexto f={f} />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => navigate('/productos')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={sinSecciones || f.enviando}>
              Guardar plato
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="min-w-0 flex-[1_1_320px]">
        <CardContent className="space-y-3 pt-6">
          <span className="text-sm font-medium text-slate-700">Imagen</span>
          <SelectorImagen onCambiar={f.setImagen} />
        </CardContent>
      </Card>
    </form>
  );
}

export function PlatoNuevoPage() {
  const navigate = useNavigate();
  const consulta = useApi(listarSeccionesHabilitadas, 'secciones-habilitadas');
  const formulario = useFormularioPlato({ onCreado: () => navigate('/productos') });
  const secciones = (consulta.datos?.items ?? []).filter(
    (seccion) => seccion.estado === 'HABILITADO',
  );

  return (
    <div className="space-y-4">
      <Breadcrumbs items={MIGAS} />
      <PageHeader titulo="Nuevo plato" />
      {consulta.cargando ? (
        <Spinner etiqueta="Cargando secciones..." />
      ) : (
        <FormularioPlato f={formulario} secciones={secciones} errorDeCarga={consulta.error} />
      )}
    </div>
  );
}
