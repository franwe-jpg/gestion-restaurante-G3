/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Con 'true', el login muestra el panel «Credenciales de prueba» (solo demos). */
  readonly VITE_MOSTRAR_CREDENCIALES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
