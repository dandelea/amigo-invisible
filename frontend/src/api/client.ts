import { API_URL } from '@/config';
import { trackSlow, waitForServer } from './server-status';

// Error de la API con el código estable del backend (`NOT_FOUND`,
// `ROOM_FULL`…). Si no se pudo contactar con el servidor, el código es
// `NETWORK`.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  // Con VALIDATION_ERROR: el error de cada campo, para mostrarlo junto a él.
  readonly fields: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string;
  // Un objeto se envía como JSON; un FormData, como multipart.
  body?: unknown;
}

// Respuesta del proxy del hosting mientras el backend arranca (502/503/504
// sin nuestro formato de error JSON). Un 503 nuestro, como
// MAX_ROOMS_REACHED, sí es JSON y no cuenta.
function isBootingResponse(res: Response): boolean {
  const json = res.headers.get('content-type')?.includes('application/json');
  return [502, 503, 504].includes(res.status) && !json;
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', token, body }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json';
  }
  const send = (): Promise<Response | null> =>
    fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: isForm
        ? body
        : body === undefined
          ? undefined
          : JSON.stringify(body),
    }).catch(() => null);

  // Si tarda, se avisa de que el servidor se está despertando. Si no hay
  // conexión o el hosting responde que está arrancando, se espera a que
  // /health conteste y se reintenta una vez. En esos casos la petición no
  // ha llegado a la app, así que reintentarla no duplica nada.
  const untrack = trackSlow();
  let res: Response | null;
  try {
    res = await send();
    if (res === null || isBootingResponse(res)) {
      res = (await waitForServer()) ? await send() : null;
    }
  } finally {
    untrack();
  }
  if (res === null) {
    throw new ApiError(0, 'NETWORK', 'No se pudo conectar con el servidor');
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data ?? {}) as {
      error?: unknown;
      message?: unknown;
      fields?: unknown;
    };
    throw new ApiError(
      res.status,
      typeof err.error === 'string' ? err.error : 'UNKNOWN',
      typeof err.message === 'string' ? err.message : res.statusText,
      err.fields && typeof err.fields === 'object'
        ? (err.fields as Record<string, string>)
        : {},
    );
  }
  return data as T;
}
