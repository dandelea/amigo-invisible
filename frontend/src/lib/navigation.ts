// Navega fuera de la app (p. ej. a una URL firmada de descarga). Está aparte
// para poder sustituirlo en los tests.
export function goToUrl(url: string): void {
  window.location.assign(url);
}
