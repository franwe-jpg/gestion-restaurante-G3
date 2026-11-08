import { afterEach, describe, expect, it, vi } from 'vitest';

import { guardarArchivo } from './guardarArchivo';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('guardarArchivo', () => {
  it('crea la URL, dispara la descarga con el nombre y la revoca', () => {
    const crear = vi.fn().mockReturnValue('blob:abc');
    const revocar = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: crear, revokeObjectURL: revocar });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const blob = new Blob(['x']);

    guardarArchivo(blob, 'reporte.pdf');

    expect(crear).toHaveBeenCalledWith(blob);
    expect(clic).toHaveBeenCalledTimes(1);
    expect(clic.mock.contexts[0]).toMatchObject({ download: 'reporte.pdf' });
    expect(revocar).toHaveBeenCalledWith('blob:abc');
    expect(document.querySelector('a[download]')).toBeNull();
    vi.unstubAllGlobals();
  });
});
