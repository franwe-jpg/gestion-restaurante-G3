import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { Textarea } from '../../../shared/components/ui/textarea';
import { Switch } from '../../../shared/components/ui/switch';
import type { ConfiguracionAlta } from '../categorias';
import type { Estado } from '../types';

import { ListaDeTextos } from './ListaDeTextos';
import { SelectorImagen } from './SelectorImagen';
import type { OpcionSeccion } from './seccionesParaEditar';
import type { useFormularioProducto } from './useFormularioProducto';
import {
  DESCRIPCION_MAXIMA,
  ETIQUETA_MAXIMA,
  ETIQUETAS_TOPE,
  INGREDIENTE_MAXIMO,
  INGREDIENTES_TOPE,
} from './validarProducto';

type Formulario = ReturnType<typeof useFormularioProducto>;

/** Lo que solo existe al editar: estado editable, imagen vigente y acciones extra. */
export interface EdicionFormulario {
  estado: Estado;
  onCambiarEstado: (estado: Estado) => void;
  imagenActual: string | null;
  onQuitarImagenActual: () => void;
  acciones?: ReactNode;
}

function CampoEstado({ edicion }: { edicion?: EdicionFormulario }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-slate-700">Estado</span>
      {edicion ? (
        <div className="flex min-h-9 items-center gap-2">
          <Switch
            id="producto-estado"
            aria-label="Habilitado"
            checked={edicion.estado === 'HABILITADO'}
            onCheckedChange={(activo) =>
              edicion.onCambiarEstado(activo ? 'HABILITADO' : 'DESHABILITADO')
            }
          />
          <span className="text-sm font-medium text-slate-900">
            {edicion.estado === 'HABILITADO' ? 'Habilitado' : 'Deshabilitado'}
          </span>
        </div>
      ) : (
        <p className="flex min-h-9 items-center text-sm font-medium text-slate-900">Habilitado</p>
      )}
    </div>
  );
}

interface CamposPrincipalesProps {
  f: Formulario;
  secciones: OpcionSeccion[];
  edicion?: EdicionFormulario;
}

function CamposPrincipales({ f, secciones, edicion }: CamposPrincipalesProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="producto-nombre" label="Nombre" required error={f.errores.nombre}>
        <Input
          id="producto-nombre"
          value={f.nombre}
          onChange={(evento) => f.setNombre(evento.target.value)}
        />
      </FormField>
      <FormField id="producto-seccion" label="Sección" required error={f.errores.seccionId}>
        <Select
          id="producto-seccion"
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
      <FormField id="producto-precio" label="Precio" required error={f.errores.precio}>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-sm text-slate-600">$</span>
          <Input
            id="producto-precio"
            inputMode="decimal"
            placeholder="12.500,00"
            className="pl-7"
            value={f.precio}
            onChange={(evento) => f.setPrecio(evento.target.value)}
          />
        </div>
      </FormField>
      <CampoEstado edicion={edicion} />
    </div>
  );
}

function CamposDeTexto({
  f,
  ingredientesObligatorios,
}: {
  f: Formulario;
  ingredientesObligatorios: boolean;
}) {
  return (
    <>
      <ListaDeTextos
        id="producto-ingredientes"
        etiqueta="Ingredientes"
        singular="ingrediente"
        plural="ingredientes"
        valores={f.ingredientes}
        onCambiar={f.setIngredientes}
        tope={INGREDIENTES_TOPE}
        maximoPorTexto={INGREDIENTE_MAXIMO}
        placeholder="Escriba un ingrediente y presione Enter"
        required={ingredientesObligatorios}
        error={f.errores.ingredientes}
      />
      <FormField id="producto-descripcion" label="Descripción" error={f.errores.descripcion}>
        <Textarea
          id="producto-descripcion"
          rows={3}
          value={f.descripcion}
          onChange={(evento) => f.setDescripcion(evento.target.value)}
        />
        <p className="text-right text-xs text-slate-500">
          {f.descripcion.length} / {DESCRIPCION_MAXIMA}
        </p>
      </FormField>
      <ListaDeTextos
        id="producto-etiquetas"
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

function AvisoSinSecciones({ mensaje }: { mensaje: string }) {
  return (
    <Alert variant="warning" titulo="Primero hay que crear una sección">
      {mensaje}{' '}
      <Link to="/productos?pestania=secciones" className="font-medium underline">
        Ir a Secciones
      </Link>
    </Alert>
  );
}

function Botones({
  guardar,
  deshabilitado,
  acciones,
}: {
  guardar: string;
  deshabilitado: boolean;
  acciones?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
      {acciones && <div className="mr-auto">{acciones}</div>}
      <Button variant="outline" onClick={() => navigate('/productos')}>
        Cancelar
      </Button>
      <Button type="submit" disabled={deshabilitado}>
        {guardar}
      </Button>
    </div>
  );
}

export interface FormularioProductoProps {
  f: Formulario;
  configuracion: Pick<
    ConfiguracionAlta,
    'botonGuardar' | 'avisoSinSecciones' | 'ingredientesObligatorios'
  >;
  secciones: OpcionSeccion[];
  errorDeCarga: string | null;
  edicion?: EdicionFormulario;
}

export function FormularioProducto({
  f,
  configuracion,
  secciones,
  errorDeCarga,
  edicion,
}: FormularioProductoProps) {
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
          {!errorDeCarga && sinSecciones && (
            <AvisoSinSecciones mensaje={configuracion.avisoSinSecciones} />
          )}
          {f.errores.general && <Alert variant="danger">{f.errores.general}</Alert>}
          <CamposPrincipales f={f} secciones={secciones} edicion={edicion} />
          <CamposDeTexto f={f} ingredientesObligatorios={configuracion.ingredientesObligatorios} />
          <Botones
            guardar={configuracion.botonGuardar}
            deshabilitado={sinSecciones || f.enviando}
            acciones={edicion?.acciones}
          />
        </CardContent>
      </Card>
      <Card className="min-w-0 flex-[1_1_320px]">
        <CardContent className="space-y-3 pt-6">
          <span className="text-sm font-medium text-slate-700">Imagen</span>
          <SelectorImagen
            onCambiar={f.setImagen}
            imagenActual={edicion?.imagenActual}
            onQuitarActual={edicion?.onQuitarImagenActual}
          />
        </CardContent>
      </Card>
    </form>
  );
}
