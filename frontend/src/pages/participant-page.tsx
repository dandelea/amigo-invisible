import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { getParticipantView, leaveRoom } from '@/api/rooms';
import { CopyLinkBox } from '@/components/copy-link-box';
import { DrawnParticipantView } from '@/components/drawn-participant-view';
import { MyWishlist } from '@/components/my-wishlist';
import { PageLayout, TwoColumns } from '@/components/page-layout';
import { ParticipantList } from '@/components/participant-list';
import { RoomHeader } from '@/components/room-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { WishlistButton } from '@/components/wishlist';
import { useLiveRoom } from '@/hooks/use-live-room';
import { personalUrl, tokenFromHash } from '@/lib/links';
import { t } from '@/texts/es';
import { NotFoundScreen } from './join-page';
import { LiveRoomFallback } from './live-room-fallback';

export function ParticipantPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = tokenFromHash(location.hash);
  const justJoined = Boolean(
    (location.state as { justJoined?: boolean } | null)?.justJoined,
  );
  const { state, reload } = useLiveRoom(
    'participant',
    token,
    getParticipantView,
  );
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (!token) return <NotFoundScreen />;
  if (state.status !== 'ready') {
    return <LiveRoomFallback state={state} onRetry={reload} />;
  }
  const { room, me, participants, pairs, maxParticipants } = state.data;
  // Tras el sorteo, la sala se convierte en el flujo del resultado. Se
  // monta de nuevo en cada ronda para empezar de cero si se repite.
  if (room.status === 'drawn') {
    return (
      <DrawnParticipantView
        key={state.data.draw.round}
        token={token}
        data={state.data}
      />
    );
  }
  const open = room.status === 'open';
  const mine = participants.find((p) => p.id === me.id)?.wishlist ?? null;

  return (
    <PageLayout>
      <TwoColumns
        top={
          <>
            <RoomHeader
              title={room.name}
              room={room}
              count={participants.length}
              max={maxParticipants}
            />
            {justJoined && (
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
          </>
        }
        main={
          <ParticipantList
            participants={participants}
            pairs={pairs}
            meId={me.id}
            hint={t.participant.listHint}
            renderTrailing={(p) =>
              p.id === me.id ? null : (
                <WishlistButton token={token} participant={p} />
              )
            }
          />
        }
        bottom={
          <>
            <MyWishlist token={token} wishlist={mine} editable={open} />
            {open && (
              <Button onClick={() => setConfirmLeave(true)}>
                {t.participant.leave}
              </Button>
            )}
          </>
        }
      />
      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title={t.participant.leaveTitle}
        body={
          <div className="flex flex-col gap-3">
            <p>{t.participant.leaveBody(room.name)}</p>
            <Card variant="muted">
              <ul className="list-disc pl-5 text-sm text-foreground">
                {t.participant.leaveConsequences.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </Card>
            <p className="text-[13px]">{t.participant.leaveNote}</p>
          </div>
        }
        confirmLabel={t.participant.leaveConfirm}
        cancelLabel={t.participant.leaveCancel}
        destructive
        onConfirm={async () => {
          await leaveRoom(token);
          await navigate('/salida', { replace: true });
        }}
      />
    </PageLayout>
  );
}
