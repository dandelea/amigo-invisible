import type { ReactNode } from 'react'
import type { Pair, Participant } from '@/api/types'
import { Avatar } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Pill } from '@/components/ui/pill'
import { initialOf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { t } from '@/texts/es'

// Fila de participante: avatar con la inicial, nombre, «Tú» si es la
// persona que mira, y una zona a la derecha para acciones.
export function ParticipantRow({
  name,
  isMe,
  detail,
  trailing,
  paired,
}: {
  name: string
  isMe?: boolean
  detail?: ReactNode
  trailing?: ReactNode
  paired?: boolean
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-2.5',
        paired ? 'min-h-14' : 'min-h-12 border-b border-muted last:border-b-0',
      )}
    >
      <Avatar variant={paired ? 'pair' : 'default'} className="z-[1]">
        {initialOf(name)}
      </Avatar>
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

// Bloque de una pareja: fondo rosado, una línea que une los dos avatares y
// un corazón en el centro. Se anuncia como «Pareja: Ana y Luis».
export function PairGroup({
  names,
  children,
  footer,
}: {
  names: [string, string]
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <li
      role="group"
      aria-label={t.pairs.label(names[0], names[1])}
      className="my-1 rounded-xl border border-pair-border bg-pair px-2.5"
    >
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute top-7 bottom-7 left-[14.5px] w-[3px] bg-primary"
        />
        <div className="absolute top-1/2 left-[5px] z-[2] flex size-[22px] -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-card">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-primary"
            role="img"
            aria-label={t.pairs.heart}
          >
            <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" />
          </svg>
        </div>
        <ul>{children}</ul>
      </div>
      {footer}
    </li>
  )
}

type Item<P> = { kind: 'single'; p: P } | { kind: 'pair'; pair: Pair; members: [P, P] }

// Agrupa los participantes: cada pareja aparece donde aparece su primer
// miembro, con los dos juntos.
function groupByPairs<P extends Participant>(
  participants: P[],
  pairs: Pair[],
): Item<P>[] {
  const byId = new Map(participants.map((p) => [p.id, p]))
  const pairOf = new Map<string, Pair>()
  for (const pair of pairs) {
    for (const id of pair.participantIds) pairOf.set(id, pair)
  }
  const done = new Set<string>()
  const items: Item<P>[] = []
  for (const p of participants) {
    if (done.has(p.id)) continue
    const pair = pairOf.get(p.id)
    const otherId = pair?.participantIds.find((id) => id !== p.id)
    const other = otherId ? byId.get(otherId) : undefined
    if (pair && other) {
      items.push({ kind: 'pair', pair, members: [p, other] })
      done.add(other.id)
    } else {
      items.push({ kind: 'single', p })
    }
    done.add(p.id)
  }
  return items
}

// Lista de participantes en una tarjeta, con las parejas agrupadas.
export function ParticipantList<P extends Participant>({
  participants,
  pairs = [],
  meId,
  hint,
  aside,
  footer,
  renderTrailing,
  renderDetail,
  renderPairFooter,
}: {
  participants: P[]
  pairs?: Pair[]
  meId?: string
  hint?: string
  aside?: ReactNode
  footer?: ReactNode
  renderTrailing?: (p: P) => ReactNode
  renderDetail?: (p: P, paired: boolean) => ReactNode
  renderPairFooter?: (pair: Pair, members: [P, P]) => ReactNode
}) {
  const row = (p: P, paired: boolean) => (
    <ParticipantRow
      key={p.id}
      name={p.name}
      isMe={p.id === meId}
      paired={paired}
      detail={renderDetail?.(p, paired)}
      trailing={renderTrailing?.(p)}
    />
  )

  return (
    <Card className="gap-0 px-3.5 py-1">
      <div className="flex items-center justify-between gap-2.5 pt-2.5 pb-1">
        <h2 className="text-[17px] font-semibold">{t.room.participants}</h2>
        {aside}
      </div>
      {hint && participants.length > 0 && (
        <p className="pb-1 text-[13px] text-muted-foreground">{hint}</p>
      )}
      {participants.length === 0 ? (
        <p className="py-3 text-[13px] text-muted-foreground">{t.room.empty}</p>
      ) : (
        <ul>
          {groupByPairs(participants, pairs).map((item) =>
            item.kind === 'single' ? (
              row(item.p, false)
            ) : (
              <PairGroup
                key={item.pair.id}
                names={[item.members[0].name, item.members[1].name]}
                footer={renderPairFooter?.(item.pair, item.members)}
              >
                {item.members.map((m) => row(m, true))}
              </PairGroup>
            ),
          )}
        </ul>
      )}
      {footer}
    </Card>
  )
}
