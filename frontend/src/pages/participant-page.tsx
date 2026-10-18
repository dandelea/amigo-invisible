import { useLocation } from 'react-router'
import { getParticipantView } from '@/api/rooms'
import { CopyLinkBox } from '@/components/copy-link-box'
import { PageLayout, TwoColumns } from '@/components/page-layout'
import { ParticipantList } from '@/components/participant-list'
import { RoomHeader } from '@/components/room-header'
import { Card } from '@/components/ui/card'
import { useLiveRoom } from '@/hooks/use-live-room'
import { personalUrl, tokenFromHash } from '@/lib/links'
import { t } from '@/texts/es'
import { LiveRoomFallback } from './live-room-fallback'

export function ParticipantPage() {
  const location = useLocation()
  const token = tokenFromHash(location.hash)
  const justJoined = Boolean(
    (location.state as { justJoined?: boolean } | null)?.justJoined,
  )
  const { state, reload } = useLiveRoom('participant', token, getParticipantView)

  if (state.status !== 'ready') {
    return <LiveRoomFallback state={state} onRetry={reload} />
  }
  const { room, me, participants, maxParticipants } = state.data

  return (
    <PageLayout>
      <TwoColumns>
        <div className="flex flex-col gap-3.5 lg:order-2">
          <RoomHeader
            title={room.name}
            room={room}
            count={participants.length}
            max={maxParticipants}
          />
          {justJoined && token && (
            <Card variant="highlighted">
              <h2 className="text-[17px] font-semibold">
                {t.participant.savePersonalTitle}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {t.participant.savePersonalBody}
              </p>
              <CopyLinkBox url={personalUrl(token)} primary />
            </Card>
          )}
        </div>
        <div className="lg:order-1">
          <ParticipantList participants={participants} meId={me.id} />
        </div>
      </TwoColumns>
    </PageLayout>
  )
}
