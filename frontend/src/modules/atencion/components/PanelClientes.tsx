import { Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ui/error-state';
import { Spinner } from '../../../shared/components/ui/spinner';
import { Button } from '../../../shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/components/ui/card';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import { Pagination } from '../../../shared/components/ui/pagination';
import { PaginationSummary } from '../../../shared/components/ui/pagination-summary';
import { SearchInput } from '../../../shared/components/ui/search-input';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';
import { listarClientes } from '../api';
import type { Cliente, PaginaCliente } from '../types';
import { ClienteFormDialog } from './ClienteFormDialog';

const LIMITE_PAGINA = 50;

function columnasDeClientes(onEditar: (cliente: Cliente) => void): ColumnaTabla<Cliente>[] {
  return [
    {
      clave: 'nombre',
      encabezado: 'Nombre',
      render: (cliente) => cliente.nombre,
    },
    {
      clave: 'telefono',
      encabezado: 'Teléfono',
      render: (cliente) => cliente.telefono,
    },
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      render: (cliente) => (
        <Button
          variant="brand-outline"
          onClick={() => onEditar(cliente)}
          aria-label={`Modificar ${cliente.nombre}`}
        >
          Modificar
        </Button>
      ),
    },
  ];
}

function VacioClientes({ pagina, filtro }: { pagina: PaginaCliente; filtro: string }) {
  const titulo =
    pagina.total > 0
      ? 'No hay clientes en esta página'
      : filtro
        ? 'No se encontraron clientes'
        : 'No hay clientes registrados';
  return (
    <EmptyState
      icono={Users}
      titulo={titulo}
      descripcion="Consulte otra página o ajuste la búsqueda."
    />
  );
}

function ListaClientes({
  pagina,
  filtro,
  onEditar,
}: {
  pagina: PaginaCliente;
  filtro: string;
  onEditar: (cliente: Cliente) => void;
}) {
  return (
    <DataTable
      columnas={columnasDeClientes(onEditar)}
      filas={pagina.items}
      obtenerClave={(cliente) => cliente.id}
      vacio={<VacioClientes pagina={pagina} filtro={filtro} />}
    />
  );
}

function useListadoClientes() {
  const [texto, setTexto] = useState('');
  const [filtro, setFiltro] = useState('');
  const [offset, setOffset] = useState(0);
  const [pagina, setPagina] = useState<PaginaCliente | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  function iniciarCarga() {
    setCargando(true);
    setError('');
  }
  useEffect(() => {
    let vigente = true;
    void listarClientes(filtro, LIMITE_PAGINA, offset)
      .then((respuesta) => {
        if (!vigente) return;
        setPagina(respuesta.exito ? respuesta.datos : null);
        setError(respuesta.exito ? '' : (respuesta.error ?? 'No se pudo consultar clientes'));
      })
      .catch(() => {
        if (!vigente) return;
        setPagina(null);
        setError('No se pudo conectar con el backend');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [filtro, offset]);
  return {
    texto,
    setTexto,
    filtro,
    setFiltro,
    offset,
    setOffset,
    pagina,
    setPagina,
    error,
    cargando,
    iniciarCarga,
  };
}

type Listado = ReturnType<typeof useListadoClientes>;

function PaginacionClientes({
  pagina,
  offset,
  setOffset,
  iniciarCarga,
}: {
  pagina: PaginaCliente;
  offset: number;
  setOffset: (offset: number) => void;
  iniciarCarga: () => void;
}) {
  const totalPaginas = Math.ceil(pagina.total / LIMITE_PAGINA);
  if (pagina.total === 0) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <PaginationSummary
        desde={offset + 1}
        hasta={Math.min(offset + pagina.items.length, pagina.total)}
        total={pagina.total}
        etiqueta="clientes"
      />
      {totalPaginas > 1 && (
        <Pagination
          pagina={Math.floor(offset / LIMITE_PAGINA) + 1}
          totalPaginas={totalPaginas}
          onCambiarPagina={(numero) => {
            const nuevoOffset = (numero - 1) * LIMITE_PAGINA;
            if (nuevoOffset === offset) return;
            iniciarCarga();
            setOffset(nuevoOffset);
          }}
        />
      )}
    </div>
  );
}

function ContenidoClientes({
  listado,
  onEditar,
}: {
  listado: Listado;
  onEditar: (cliente: Cliente) => void;
}) {
  const { pagina, filtro, offset, setOffset, error, cargando } = listado;
  return (
    <>
      {cargando && <Spinner etiqueta="Cargando clientes…" />}
      {!cargando && error && <ErrorState descripcion={error} />}
      {!cargando && pagina && (
        <>
          <ListaClientes pagina={pagina} filtro={filtro} onEditar={onEditar} />
          <PaginacionClientes
            pagina={pagina}
            offset={offset}
            setOffset={setOffset}
            iniciarCarga={listado.iniciarCarga}
          />
        </>
      )}
    </>
  );
}

function FiltroClientes({ listado }: { listado: Listado }) {
  const buscar = () => {
    const nuevoFiltro = listado.texto.trim();
    if (nuevoFiltro === listado.filtro && listado.offset === 0) return;
    listado.iniciarCarga();
    listado.setOffset(0);
    listado.setFiltro(nuevoFiltro);
  };
  return (
    <TableToolbar>
      <form
        className="flex w-full gap-2"
        onSubmit={(evento) => {
          evento.preventDefault();
          buscar();
        }}
      >
        <SearchInput
          aria-label="Buscar clientes"
          type="search"
          value={listado.texto}
          onChange={(evento) => listado.setTexto(evento.target.value)}
          onLimpiar={() => {
            if (listado.filtro || listado.offset !== 0) {
              listado.iniciarCarga();
              listado.setFiltro('');
              listado.setOffset(0);
            }
            listado.setTexto('');
          }}
        />
        <Button variant="brand-outline" type="submit">
          Buscar
        </Button>
      </form>
    </TableToolbar>
  );
}

export function PanelClientes() {
  const listado = useListadoClientes();
  const [seleccionado, setSeleccionado] = useState<Cliente | null>(null);
  function alGuardar(actualizado: Cliente) {
    listado.setPagina(
      (actual) =>
        actual && {
          ...actual,
          items: actual.items.map((cliente) =>
            cliente.id === actualizado.id ? actualizado : cliente,
          ),
        },
    );
    setSeleccionado(null);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes</CardTitle>
        <CardDescription>Datos de contacto y edición de los clientes registrados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FiltroClientes listado={listado} />
        <ContenidoClientes listado={listado} onEditar={setSeleccionado} />
        {seleccionado && (
          <ClienteFormDialog
            cliente={seleccionado}
            onOpenChange={() => setSeleccionado(null)}
            onGuardado={alGuardar}
          />
        )}
      </CardContent>
    </Card>
  );
}
