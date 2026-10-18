/// <reference types="vite/client" />

// Variables de entorno del frontend (se fijan al compilar).
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
