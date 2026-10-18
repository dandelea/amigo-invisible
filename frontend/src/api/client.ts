import { API_URL } from '@/config'

// Error de la API con el código estable del backend (`NOT_FOUND`,
// `ROOM_FULL`…). Si no se pudo contactar con el servidor, el código es
// `NETWORK`.
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  token?: string
  body?: unknown
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', token, body }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'No se pudo conectar con el servidor')
  }

  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const err = (data ?? {}) as { error?: unknown; message?: unknown }
    throw new ApiError(
      res.status,
      typeof err.error === 'string' ? err.error : 'UNKNOWN',
      typeof err.message === 'string' ? err.message : res.statusText,
    )
  }
  return data as T
}
