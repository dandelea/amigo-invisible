import { API_URL } from '@/config'

// Error de la API con el código estable del backend (`NOT_FOUND`,
// `ROOM_FULL`…). Si no se pudo contactar con el servidor, el código es
// `NETWORK`.
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  // Con VALIDATION_ERROR: el error de cada campo, para mostrarlo junto a él.
  readonly fields: Record<string, string>

  constructor(
    status: number,
    code: string,
    message: string,
    fields: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  token?: string
  // Un objeto se envía como JSON; un FormData, como multipart.
  body?: unknown
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', token, body }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json'
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: isForm
        ? body
        : body === undefined
          ? undefined
          : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'No se pudo conectar con el servidor')
  }

  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const err = (data ?? {}) as {
      error?: unknown
      message?: unknown
      fields?: unknown
    }
    throw new ApiError(
      res.status,
      typeof err.error === 'string' ? err.error : 'UNKNOWN',
      typeof err.message === 'string' ? err.message : res.statusText,
      err.fields && typeof err.fields === 'object'
        ? (err.fields as Record<string, string>)
        : {},
    )
  }
  return data as T
}
