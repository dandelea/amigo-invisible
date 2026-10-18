import type { Room } from '@/api/types'
import { Pill } from '@/components/ui/pill'
import { roomSummary } from '@/lib/room'
import { t } from '@/texts/es'

// Cabecera de la sala: título, «Entrega: 20 dic 2026 · hasta 15 €» y el
// estado con el número de participantes.
export function RoomHeader({
  title,
  room,
  count,
  max,
  showSummary = true,
}: {
  title: string
  room: Room
  count: number
  max: number
  showSummary?: boolean
}) {
  const summary = showSummary ? roomSummary(room) : ''
  return (
    <div className="flex items-start justify-between gap-2.5">
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight font-bold break-words">{title}</h1>
        {summary && (
          <p className="text-[13px] text-muted-foreground">{summary}</p>
        )}
      </div>
      <Pill className="mt-1">
        {t.room.status(room.status === 'open', count, max)}
      </Pill>
    </div>
  )
}
