import { Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Pagination } from '../../../shared/components/ui/pagination';
import { SearchInput } from '../../../shared/components/ui/search-input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/components/ui/table';
import { listarClientes } from '../api';
import { ClienteFormDialog } from '../components/ClienteFormDialog';
import type { Cliente, PaginaCliente } from '../types';

const LIMITE_PAGINA = 50;

function ListaClientes({
  pagina,
  onEditar,
}: {
  pagina: PaginaCliente;
  onEditar: (cliente: Cliente) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pagina.items.map((cliente) => (
          <TableRow key={cliente.id}>
            <TableCell>{cliente.nombre}</TableCell>
            <TableCell>{cliente.telefono}</TableCell>
            <TableCell>
              <Button
                variant="outline"
                onClick={() => onEditar(cliente)}
                aria-label={`Modificar ${cliente.nombre}`}
              >
                Modificar
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ResultadoClientes({
  pagina,
  filtro,
  onEditar,
}: {
  pagina: PaginaCliente;
  filtro: string;
  onEditar: (cliente: Cliente) => void;
}) {
  if (pagina.items.length) return <ListaClientes pagina={pagina} onEditar={onEditar} />;
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

function useListadoClientes() {
  const [texto, setTexto] = useState('');
  const [filtro, setFiltro] = useState('');
  const [offset, setOffset] = useState(0);
  const [pagina, setPagina] = useState<PaginaCliente | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    void listarClientes(filtro, LIMITE_PAGINA, offset).then((respuesta) => {
      if (!vigente) return;
      setPagina(respuesta.exito ? respuesta.datos : null);
      setError(respuesta.exito ? '' : (respuesta.error ?? 'No se pudo consultar clientes'));
    });
    return () => {
      vigente = false;
    };
  }, [filtro, offset]);

  return { texto, setTexto, filtro, setFiltro, offset, setOffset, pagina, setPagina, error };
}

type Listado = ReturnType<typeof useListadoClientes>;

function PaginacionClientes({
  pagina,
  offset,
  setOffset,
}: {
  pagina: PaginaCliente;
  offset: number;
  setOffset: (offset: number) => void;
}) {
  if (pagina.total <= LIMITE_PAGINA) return null;
  return (
    <Pagination
      pagina={Math.floor(offset / LIMITE_PAGINA) + 1}
      totalPaginas={Math.ceil(pagina.total / LIMITE_PAGINA)}
      onCambiarPagina={(numero) => setOffset((numero - 1) * LIMITE_PAGINA)}
    />
  );
}

function PanelClientes({
  listado,
  onEditar,
}: {
  listado: Listado;
  onEditar: (cliente: Cliente) => void;
}) {
  const { texto, setTexto, filtro, setFiltro, offset, setOffset, pagina, error } = listado;
  const buscar = () => {
    setOffset(0);
    setFiltro(texto.trim());
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <form
          className="flex gap-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            buscar();
          }}
        >
          <SearchInput
            aria-label="Buscar clientes"
            type="search"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            onLimpiar={() => {
              setTexto('');
              setFiltro('');
              setOffset(0);
            }}
          />
          <Button type="submit">Buscar</Button>
        </form>
        {error && <Alert variant="danger">{error}</Alert>}
        {pagina && (
          <>
            <ResultadoClientes pagina={pagina} filtro={filtro} onEditar={onEditar} />
            <p>{pagina.total} clientes</p>
            <PaginacionClientes pagina={pagina} offset={offset} setOffset={setOffset} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AtencionPage() {
  const listado = useListadoClientes();
  const [seleccionado, setSeleccionado] = useState<Cliente | null>(null);
  const alGuardar = (actualizado: Cliente) => {
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
  };

  return (
    <div className="space-y-6">
      <PageHeader titulo="Atención al Público" descripcion="Consulta y modificación de clientes." />
      <PanelClientes listado={listado} onEditar={setSeleccionado} />
      {seleccionado && (
        <ClienteFormDialog
          cliente={seleccionado}
          onOpenChange={() => setSeleccionado(null)}
          onGuardado={alGuardar}
        />
      )}
    </div>
  );
}
