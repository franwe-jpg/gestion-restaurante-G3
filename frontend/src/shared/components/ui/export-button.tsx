import { Download } from 'lucide-react';

import { Button } from './button';

export interface ExportButtonProps<T extends object> {
  filas: T[];
  nombreArchivo: string;
  columnas?: string[];
  etiqueta?: string;
}

function escaparCelda(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return `"${texto.replaceAll('"', '""')}"`;
}

export function ExportButton<T extends object>({
  filas,
  nombreArchivo,
  columnas,
  etiqueta = 'Exportar CSV',
}: ExportButtonProps<T>) {
  const exportar = () => {
    const primeraFila = filas[0] as Record<string, unknown> | undefined;
    const columnasFinales = columnas ?? (primeraFila ? Object.keys(primeraFila) : []);
    const lineas = [
      columnasFinales.map(escaparCelda).join(','),
      ...filas.map((fila) =>
        columnasFinales
          .map((columna) => escaparCelda((fila as Record<string, unknown>)[columna]))
          .join(','),
      ),
    ];
    const blob = new Blob([lineas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={exportar}>
      <Download className="h-4 w-4" />
      {etiqueta}
    </Button>
  );
}
