import type { ReactNode } from 'react'
import type { Participant } from '@/api/types'
import { Avatar } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Pill } from '@/components/ui/pill'
import { initialOf } from '@/lib/format'
import { t } from '@/texts/es'

// Fila de participante: avatar con la inicial, nombre, «Tú» si es la
// persona que mira, y una zona a la derecha para acciones.
export function ParticipantRow({
  name,
  isMe,
  detail,
  trailing,
}: {
  name: string
  isMe?: boolean
  detail?: ReactNode
  trailing?: ReactNode
}) {
  return (
    <li className="flex min-h-12 items-center gap-2.5 border-b border-muted last:border-b-0">
      <Avatar>{initialOf(name)}</Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-bold break-words">
          {name} {isMe && <Pill>{t.room.you}</Pill>}
        </span>
        {detail && (
          <span className="text-[13px] text-muted-foreground">{detail}</span>
        )}
      </div>
      {trailing}
    </li>
  )
}

// Lista de participantes en una tarjeta. Las parejas llegan en la Fase 3.
export function ParticipantList({
  participants,
  meId,
  hint,
  aside,
}: {
  participants: Participant[]
  meId?: string
  hint?: string
  aside?: ReactNode
}) {
  return (
    <Card className="gap-0 px-3.5 py-1">
      <div className="flex items-center justify-between gap-2.5 pt-2.5 pb-1">
        <h2 className="text-[17px] font-semibold">{t.room.participants}</h2>
        {aside}
      </div>
      {hint && (
        <p className="pb-1 text-[13px] text-muted-foreground">{hint}</p>
      )}
      {participants.length === 0 ? (
        <p className="py-3 text-[13px] text-muted-foreground">{t.room.empty}</p>
      ) : (
        <ul>
          {participants.map((p) => (
            <ParticipantRow key={p.id} name={p.name} isMe={p.id === meId} />
          ))}
        </ul>
      )}
    </Card>
  )
}
