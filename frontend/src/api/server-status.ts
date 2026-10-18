import { useSyncExternalStore } from 'react';
import { API_URL } from '@/config';

// Estado «despertando el servidor». El backend está en un plan gratuito que
// se duerme y tarda hasta un minuto en arrancar: mientras tanto la app
// muestra un aviso y espera, en lugar de fallar.

// Una petición que tarda más que esto activa el aviso.
export const SLOW_MS = 2500;
// Cada cuánto se consulta /health mientras se espera.
export const HEALTH_POLL_MS = 3000;
// Tiempo máximo de espera antes de rendirse.
export const WAKE_TIMEOUT_MS = 90_000;

let slowRequests = 0;
let waitingForHealth = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function isWaking(): boolean {
  return slowRequests > 0 || waitingForHealth > 0;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useServerWaking(): boolean {
  return useSyncExternalStore(subscribe, isWaking);
}

// Marca una petición como lenta mientras dure; devuelve la función para
// desmarcarla.
export function trackSlow(): () => void {
  let marked = false;
  const timer = setTimeout(() => {
    marked = true;
    slowRequests++;
    emit();
  }, SLOW_MS);
  return () => {
    clearTimeout(timer);
    if (marked) {
      slowRequests--;
      emit();
    }
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Espera a que /health responda. Devuelve false si se agota el tiempo.
export async function waitForServer(): Promise<boolean> {
  waitingForHealth++;
  emit();
  try {
    const deadline = Date.now() + WAKE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${API_URL}/health`);
        if (res.ok) return true;
      } catch {
        // Sigue dormido o sin conexión: se vuelve a intentar.
      }
      await sleep(HEALTH_POLL_MS);
    }
    return false;
  } finally {
    waitingForHealth--;
    emit();
  }
}

// Solo para los tests.
export function resetServerStatus(): void {
  slowRequests = 0;
  waitingForHealth = 0;
  emit();
}
