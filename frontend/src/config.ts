// URL del backend. En producción la define VITE_API_URL al compilar.
export const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '');

export const MAX_PARTICIPANTS = 30;
