import { Camera, ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import { Button } from '../../../shared/components/ui/button';

export const IMAGEN_TAMANO_MAXIMO = 5 * 1024 * 1024;
export const MENSAJE_IMAGEN_INVALIDA = 'La imagen debe ser JPG, PNG o HEIC y pesar hasta 5 MB.';

const FORMATOS = /\.(jpe?g|png|heic|heif)$/i;
const TIPOS = /^image\/(jpeg|png|heic|heif)$/;
const HEIC = /\.(heic|heif)$|^image\/(heic|heif)$/i;
const ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif';
const BYTES_POR_MB = 1024 * 1024;

export interface SelectorImagenProps {
  onCambiar: (archivo: File | null) => void;
}

interface Seleccion {
  archivo: File;
  vistaPrevia: string | null;
}

function esFormatoPermitido(archivo: File): boolean {
  return TIPOS.test(archivo.type) || FORMATOS.test(archivo.name);
}

function esHeic(archivo: File): boolean {
  return HEIC.test(archivo.type) || HEIC.test(archivo.name);
}

function useSeleccionImagen(onCambiar: (archivo: File | null) => void) {
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const vigente = useRef<string | null>(null);

  const liberar = () => {
    if (vigente.current) URL.revokeObjectURL(vigente.current);
    vigente.current = null;
  };
  useEffect(() => liberar, []);

  const elegir = (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    if (!esFormatoPermitido(archivo) || archivo.size > IMAGEN_TAMANO_MAXIMO) {
      setError(MENSAJE_IMAGEN_INVALIDA);
      return;
    }
    liberar();
    vigente.current = esHeic(archivo) ? null : URL.createObjectURL(archivo);
    setError(null);
    setSeleccion({ archivo, vistaPrevia: vigente.current });
    onCambiar(archivo);
  };

  const quitar = () => {
    liberar();
    setSeleccion(null);
    onCambiar(null);
  };

  return { seleccion, error, elegir, quitar };
}

function Elegida({ seleccion, onQuitar }: { seleccion: Seleccion; onQuitar: () => void }) {
  const { archivo, vistaPrevia } = seleccion;
  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-200 p-2">
      {vistaPrevia ? (
        <img
          src={vistaPrevia}
          alt="Vista previa de la imagen"
          className="h-16 w-16 rounded-md object-cover"
        />
      ) : (
        <div className="min-w-0 flex-1 text-sm">
          <p className="truncate font-medium text-slate-900">{archivo.name}</p>
          <p className="text-slate-500">{(archivo.size / BYTES_POR_MB).toFixed(1)} MB</p>
        </div>
      )}
      <Button variant="ghost" size="sm" aria-label="Quitar imagen" onClick={onQuitar}>
        <X className="h-4 w-4" aria-hidden="true" />
        Quitar
      </Button>
    </div>
  );
}

export function SelectorImagen({ onCambiar }: SelectorImagenProps) {
  const { seleccion, error, elegir, quitar } = useSeleccionImagen(onCambiar);
  const archivoRef = useRef<HTMLInputElement>(null);
  const camaraRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => archivoRef.current?.click()}>
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Elegir archivo
        </Button>
        <Button variant="outline" onClick={() => camaraRef.current?.click()}>
          <Camera className="h-4 w-4" aria-hidden="true" />
          Sacar foto
        </Button>
      </div>
      <input
        ref={archivoRef}
        type="file"
        accept={ACCEPT}
        aria-label="Archivo de imagen"
        className="hidden"
        onChange={elegir}
      />
      <input
        ref={camaraRef}
        type="file"
        accept={ACCEPT}
        capture="environment"
        aria-label="Foto de la cámara"
        className="hidden"
        onChange={elegir}
      />
      {seleccion && <Elegida seleccion={seleccion} onQuitar={quitar} />}
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
