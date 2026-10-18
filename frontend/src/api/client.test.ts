import { act, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { WakingOverlay } from '@/components/waking-overlay';
import { t } from '@/texts/es';
import { ApiError, apiRequest } from './client';
import {
  HEALTH_POLL_MS,
  isWaking,
  resetServerStatus,
  SLOW_MS,
  WAKE_TIMEOUT_MS,
} from './server-status';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
const html = (status: number) =>
  new Response('<html>Arrancando…</html>', {
    status,
    headers: { 'content-type': 'text/html' },
  });

// Simula el backend: `api` responde a las rutas de la API y `health` a
// /health, cada uno con su secuencia de respuestas.
function mockServer(
  api: (() => Promise<Response>)[],
  health: (() => Promise<Response>)[] = [],
) {
  const calls = { api: 0, health: 0 };
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.endsWith('/health')) {
        const next = health[Math.min(calls.health, health.length - 1)];
        calls.health++;
        return next();
      }
      const next = api[Math.min(calls.api, api.length - 1)];
      calls.api++;
      return next();
    }),
  );
  return calls;
}

const offline = () => Promise.reject(new TypeError('Failed to fetch'));
const ok = (body: unknown) => () => Promise.resolve(json(body));
const after = (ms: number, res: () => Response) => () =>
  new Promise<Response>((resolve) => setTimeout(() => resolve(res()), ms));

beforeEach(() => {
  vi.useFakeTimers();
  resetServerStatus();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('apiRequest con el servidor dormido', () => {
  it('una respuesta rápida no muestra el aviso', async () => {
    mockServer([ok({ hola: 1 })]);
    await expect(apiRequest('/api/x')).resolves.toEqual({ hola: 1 });
    expect(isWaking()).toBe(false);
  });

  it('una petición lenta activa el aviso hasta que responde', async () => {
    mockServer([after(SLOW_MS + 2000, () => json({ hola: 1 }))]);
    const request = apiRequest('/api/x');
    await vi.advanceTimersByTimeAsync(SLOW_MS - 100);
    expect(isWaking()).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(isWaking()).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(request).resolves.toEqual({ hola: 1 });
    expect(isWaking()).toBe(false);
  });

  it('sin conexión, espera a /health y reintenta', async () => {
    const calls = mockServer(
      [offline, ok({ hola: 1 })],
      [offline, () => Promise.resolve(html(503)), ok({ status: 'ok' })],
    );
    const request = apiRequest('/api/x');
    await vi.advanceTimersByTimeAsync(0);
    expect(isWaking()).toBe(true);
    await vi.advanceTimersByTimeAsync(HEALTH_POLL_MS * 3);
    await expect(request).resolves.toEqual({ hola: 1 });
    expect(calls).toEqual({ api: 2, health: 3 });
    expect(isWaking()).toBe(false);
  });

  it('un 503 del hosting mientras arranca también espera y reintenta', async () => {
    const calls = mockServer(
      [() => Promise.resolve(html(503)), ok({ hola: 1 })],
      [ok({ status: 'ok' })],
    );
    await expect(apiRequest('/api/x')).resolves.toEqual({ hola: 1 });
    expect(calls.api).toBe(2);
  });

  it('un 503 nuestro (JSON) es un error normal, sin esperar', async () => {
    const calls = mockServer([
      () =>
        Promise.resolve(
          json({ error: 'MAX_ROOMS_REACHED', message: 'x' }, 503),
        ),
    ]);
    await expect(apiRequest('/api/rooms')).rejects.toMatchObject({
      code: 'MAX_ROOMS_REACHED',
    });
    expect(calls.health).toBe(0);
  });

  it('si no despierta a tiempo, falla con NETWORK', async () => {
    mockServer([offline], [offline]);
    const request = apiRequest('/api/x');
    const failed = expect(request).rejects.toBeInstanceOf(ApiError);
    await vi.advanceTimersByTimeAsync(WAKE_TIMEOUT_MS + HEALTH_POLL_MS);
    await failed;
    await expect(request).rejects.toMatchObject({ code: 'NETWORK' });
    expect(isWaking()).toBe(false);
  });
});

describe('WakingOverlay', () => {
  it('se muestra encima mientras el servidor despierta', async () => {
    mockServer([after(SLOW_MS + 1000, () => json({}))]);
    render(createElement(WakingOverlay));
    expect(screen.queryByRole('status')).toBeNull();
    const request = apiRequest('/api/x');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SLOW_MS + 100);
    });
    expect(screen.getByRole('status')).toHaveTextContent(t.status.waking.title);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await request;
    expect(screen.queryByRole('status')).toBeNull();
  });
});
