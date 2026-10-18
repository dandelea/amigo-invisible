import { StatusScreen } from '@/components/status-screen'
import { Button } from '@/components/ui/button'
import type { LiveRoomState } from '@/hooks/use-live-room'
import { errorText, t } from '@/texts/es'
import { NotFoundScreen } from './join-page'

// Lo que se muestra mientras carga la sala o si no se puede cargar.
export function LiveRoomFallback({
  state,
  onRetry,
}: {
  state: Exclude<LiveRoomState<unknown>, { status: 'ready' }>
  onRetry: () => void
}) {
  if (state.status === 'loading') {
    return <StatusScreen title={t.loading} spinner />
  }
  if (state.code === 'NOT_FOUND') return <NotFoundScreen />
  return (
    <StatusScreen
      title={t.status.error.title}
      body={errorText(state.code)}
      action={<Button onClick={onRetry}>{t.retry}</Button>}
    />
  )
}
