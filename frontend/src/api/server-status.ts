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
// Tiempo máximo de una petición a la API. El hosting puede retener la
// conexión sin responder nunca (Render cuando no consigue arrancar la
// instancia): sin este límite, el aviso se quedaría para siempre.
export const REQUEST_TIMEOUT_MS = 60_000;
// Tiempo máximo de cada consulta a /health.
export const HEALTH_TIMEOUT_MS = 10_000;

// fetch con tiempo máximo. Si se agota, rechaza con un AbortError.
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

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
        const res = await fetchWithTimeout(
          `${API_URL}/health`,
          {},
          Math.min(HEALTH_TIMEOUT_MS, deadline - Date.now()),
        );
        if (res.ok) return true;
      } catch {
        // Sigue dormido, sin conexión o sin responder: se vuelve a intentar.
      }
      const left = deadline - Date.now();
      if (left <= 0) break;
      await sleep(Math.min(HEALTH_POLL_MS, left));
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
