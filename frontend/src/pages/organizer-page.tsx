import { useLocation } from 'react-router'
import { getOrganizerView } from '@/api/rooms'
import { CopyLinkBox } from '@/components/copy-link-box'
import { PageLayout, TwoColumns } from '@/components/page-layout'
import { ParticipantList } from '@/components/participant-list'
import { RoomHeader } from '@/components/room-header'
import { Card } from '@/components/ui/card'
import { useLiveRoom } from '@/hooks/use-live-room'
import { inviteUrl, tokenFromHash } from '@/lib/links'
import { roomSummary } from '@/lib/room'
import { t } from '@/texts/es'
import { LiveRoomFallback } from './live-room-fallback'

export function OrganizerPage() {
  const token = tokenFromHash(useLocation().hash)
  const { state, reload } = useLiveRoom('organizer', token, getOrganizerView)

  if (state.status !== 'ready') {
    return <LiveRoomFallback state={state} onRetry={reload} />
  }
  const { room, inviteCode, participants, maxParticipants } = state.data
  const summary = roomSummary(room)

  return (
    <PageLayout>
      <TwoColumns>
        <div className="flex flex-col gap-3.5 lg:order-2">
          <RoomHeader
            title={t.organizer.title}
            room={room}
            count={participants.length}
            max={maxParticipants}
            showSummary={false}
          />
          <Card>
            <b className="break-words">{room.name}</b>
            {summary && (
              <p className="text-[13px] text-muted-foreground">{summary}</p>
            )}
          </Card>
          {room.status === 'open' && (
            <Card>
              <h2 className="text-[17px] font-semibold">
                {t.organizer.inviteTitle}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {t.organizer.inviteHint}
              </p>
              <CopyLinkBox url={inviteUrl(inviteCode)} />
            </Card>
          )}
        </div>
        <div className="lg:order-1">
          <ParticipantList participants={participants} />
        </div>
      </TwoColumns>
    </PageLayout>
  )
}
