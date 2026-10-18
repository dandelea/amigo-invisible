import { useState } from 'react';
import { useLocation } from 'react-router';
import { ApiError } from '@/api/client';
import { deletePair, getOrganizerView, setPairRule } from '@/api/rooms';
import { CopyLinkBox } from '@/components/copy-link-box';
import { EditRoomDialog } from '@/components/edit-room-dialog';
import { MarkPairDialog } from '@/components/mark-pair-dialog';
import { PageLayout, TwoColumns } from '@/components/page-layout';
import { ParticipantActions } from '@/components/participant-actions';
import { ParticipantList } from '@/components/participant-list';
import { RoomHeader } from '@/components/room-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useLiveRoom } from '@/hooks/use-live-room';
import { inviteUrl, tokenFromHash } from '@/lib/links';
import { roomSummary } from '@/lib/room';
import { errorText, t } from '@/texts/es';
import { NotFoundScreen } from './join-page';
import { LiveRoomFallback } from './live-room-fallback';

export function OrganizerPage() {
  const token = tokenFromHash(useLocation().hash);
  const { state, reload } = useLiveRoom('organizer', token, getOrganizerView);
  const [editing, setEditing] = useState(false);
  const [markingPair, setMarkingPair] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) return <NotFoundScreen />;
  if (state.status !== 'ready') {
    return <LiveRoomFallback state={state} onRetry={reload} />;
  }
  const { room, inviteCode, participants, pairs, maxParticipants } = state.data;
  const open = room.status === 'open';
  const summary = roomSummary(room);
  const paired = new Set(pairs.flatMap((p) => p.participantIds));
  const unpairedCount = participants.filter((p) => !paired.has(p.id)).length;

  // Las acciones rápidas (regla, deshacer pareja) muestran su error aquí;
  // el estado nuevo llega por el aviso del socket.
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof ApiError ? errorText(e.code, e.message) : t.errors.default,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageLayout>
      <TwoColumns
        top={
          <>
            <RoomHeader
              title={t.organizer.title}
              room={room}
              count={participants.length}
              max={maxParticipants}
              showSummary={false}
            />
            <Card className="flex-row items-center justify-between gap-2.5">
              <div className="min-w-0">
                <b className="break-words">{room.name}</b>
                {summary && (
                  <p className="text-[13px] text-muted-foreground">{summary}</p>
                )}
              </div>
              {open && (
                <Button onClick={() => setEditing(true)}>
                  {t.organizer.edit}
                </Button>
              )}
            </Card>
            <Card className="flex-row items-center gap-3">
              <div className="flex flex-1 flex-col gap-0.5">
                <span id="pair-rule" className="font-semibold">
                  {t.organizer.pairRule}
                </span>
                <span
                  id="pair-rule-state"
                  className="text-[13px] text-muted-foreground"
                >
                  {room.pairRuleEnabled
                    ? t.organizer.pairRuleOn
                    : t.organizer.pairRuleOff}
                </span>
              </div>
              <Switch
                aria-labelledby="pair-rule"
                aria-describedby="pair-rule-state"
                checked={room.pairRuleEnabled}
                disabled={!open || busy}
                onCheckedChange={(enabled) =>
                  run(() => setPairRule(token, enabled))
                }
              />
            </Card>
            {error && <Alert variant="error">{error}</Alert>}
          </>
        }
        main={
          <ParticipantList
            participants={participants}
            pairs={pairs}
            renderDetail={(_, isPaired) => (isPaired ? null : t.pairs.single)}
            renderTrailing={(p) =>
              open ? <ParticipantActions token={token} participant={p} /> : null
            }
            renderPairFooter={(pair) =>
              open ? (
                <Button
                  variant="destructive"
                  className="mb-2.5 w-full"
                  disabled={busy}
                  onClick={() => run(() => deletePair(token, pair.id))}
                >
                  {t.organizer.undoPair}
                </Button>
              ) : null
            }
            footer={
              open && unpairedCount >= 2 ? (
                <Button
                  className="mt-1.5 mb-2.5"
                  onClick={() => setMarkingPair(true)}
                >
                  {t.organizer.markPair}
                </Button>
              ) : null
            }
          />
        }
        bottom={
          <>
            {open && (
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
            {open && (
              <p className="text-[13px] text-muted-foreground">
                {t.organizer.lockedNote}
              </p>
            )}
          </>
        }
      />
      <EditRoomDialog
        open={editing}
        onOpenChange={setEditing}
        token={token}
        room={room}
      />
      <MarkPairDialog
        open={markingPair}
        onOpenChange={setMarkingPair}
        token={token}
        participants={participants}
        pairs={pairs}
      />
    </PageLayout>
  );
}
