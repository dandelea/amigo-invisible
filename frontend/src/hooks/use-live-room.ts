import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/client'
import type { Role } from '@/api/types'
import { subscribeToRoom } from '@/realtime/socket'

export type LiveRoomState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; code: string }

// Carga el estado de la sala por HTTP y lo vuelve a cargar con cada aviso
// del socket y al reconectar. `load` debe ser estable (una función del
// módulo de la API).
export function useLiveRoom<T>(
  role: Role,
  token: string | null,
  load: (token: string) => Promise<T>,
): { state: LiveRoomState<T>; reload: () => void } {
  const [state, setState] = useState<LiveRoomState<T>>(
    token ? { status: 'loading' } : { status: 'error', code: 'NOT_FOUND' },
  )
  // Solo se aplica la respuesta más reciente, por si llegan desordenadas.
  const latest = useRef(0)

  const reload = useCallback(() => {
    if (!token) return
    const request = ++latest.current
    load(token).then(
      (data) => {
        if (request === latest.current) setState({ status: 'ready', data })
      },
      (error: unknown) => {
        if (request !== latest.current) return
        const code = error instanceof ApiError ? error.code : 'UNKNOWN'
        // Un fallo pasajero no borra lo que ya se estaba mostrando; un
        // enlace inválido, sí.
        setState((prev) =>
          prev.status === 'ready' && code !== 'NOT_FOUND'
            ? prev
            : { status: 'error', code },
        )
      },
    )
  }, [token, load])

  useEffect(() => {
    if (!token) return
    reload()
    return subscribeToRoom(role, token, {
      onChange: reload,
      onAuthError: () => {
        latest.current++
        setState({ status: 'error', code: 'NOT_FOUND' })
      },
    })
  }, [role, token, reload])

  return { state, reload }
}
