import { useEffect, useState } from 'react';
import { ApiError } from '@/api/client';
import { getAssignment, markAssignmentSeen } from '@/api/rooms';
import type { Assignment, ParticipantView } from '@/api/types';
import { PageLayout } from '@/components/page-layout';
import { MyWishlist } from '@/components/my-wishlist';
import { RoomHeader } from '@/components/room-header';
import { Roulette } from '@/components/roulette';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { StatusScreen } from '@/components/status-screen';
import { AllWishlistsButton } from '@/components/wishlist';
import { prefersReducedMotion } from '@/lib/motion';
import { errorText, t } from '@/texts/es';
import { DrawResult, RepeatedNotice, RevealCard } from './draw-reveal';

type Phase = 'reveal' | 'spinning' | 'result';

// Sala del participante una vez hecho el sorteo. Se monta de nuevo en cada
// ronda (key = ronda), así que repetir el sorteo vuelve al principio:
// tarjeta para descubrir → ruleta (solo la primera vez) → resultado.
export function DrawnParticipantView({
  token,
  data,
}: {
  token: string;
  data: ParticipantView;
}) {
  const { room, me, participants, pairs, maxParticipants, draw } = data;
  const [phase, setPhase] = useState<Phase>(draw.seen ? 'result' : 'reveal');
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // La asignación se pide al descubrirla (o directamente si ya se vio).
  useEffect(() => {
    if (phase === 'reveal') return;
    let active = true;
    getAssignment(token).then(
      (a) => active && setAssignment(a),
      (e: unknown) =>
        active &&
        setError(
          e instanceof ApiError
            ? errorText(e.code, e.message)
            : t.errors.default,
        ),
    );
    return () => {
      active = false;
    };
  }, [phase, token, attempt]);

  // Tras el sorteo se puede seguir cambiando la lista propia y consultar las
  // de los demás (decisión del usuario, Fase 5).
  const mine = participants.find((p) => p.id === me.id)?.wishlist ?? null;
  const wishlists = (
    <>
      <MyWishlist token={token} wishlist={mine} editable />
      <AllWishlistsButton
        token={token}
        participants={participants}
        meId={me.id}
      />
    </>
  );

  function showResult() {
    setPhase('result');
    // El contador del organizador; si falla, no impide ver el resultado.
    markAssignmentSeen(token, draw.round).catch(() => undefined);
  }

  function discover() {
    if (prefersReducedMotion()) showResult();
    else setPhase('spinning');
  }

  if (error) {
    return (
      <StatusScreen
        title={t.status.error.title}
        body={error}
        action={
          <Button
            onClick={() => {
              setError(null);
              setAttempt((n) => n + 1);
            }}
          >
            {t.retry}
          </Button>
        }
      />
    );
  }

  if (phase === 'spinning') {
    if (!assignment) return <StatusScreen title={t.loading} spinner />;
    // Solo resultados posibles: ni uno mismo ni su pareja si la regla está
    // activa (son datos que el participante ya ve en la sala).
    const partner = room.pairRuleEnabled
      ? pairs
          .find((p) => p.participantIds.includes(me.id))
          ?.participantIds.find((id) => id !== me.id)
      : undefined;
    const names = participants
      .filter((p) => p.id !== me.id && p.id !== partner)
      .map((p) => p.name);
    return (
      <PageLayout className="lg:max-w-[560px]">
        <Pill>{t.draw.live}</Pill>
        <div>
          <h1 className="text-[28px] leading-tight font-bold">
            {t.draw.spinning}
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {t.draw.almost(me.name)}
          </p>
        </div>
        <Roulette
          names={names}
          winner={assignment.receiver.name}
          onDone={showResult}
        />
      </PageLayout>
    );
  }

  if (phase === 'result') {
    if (!assignment) return <StatusScreen title={t.loading} spinner />;
    return (
      <PageLayout className="lg:max-w-[560px]">
        <DrawResult
          token={token}
          me={me.name}
          room={room}
          assignment={assignment}
        >
          {wishlists}
        </DrawResult>
      </PageLayout>
    );
  }

  const repeated = draw.round > 1;
  return (
    <PageLayout className="lg:max-w-[560px]">
      <RoomHeader
        title={room.name}
        room={room}
        count={participants.length}
        max={maxParticipants}
      />
      {repeated && <RepeatedNotice />}
      <RevealCard name={me.name} repeated={repeated} onDiscover={discover} />
      {repeated && (
        <Card>
          <h2 className="text-[17px] font-semibold">{t.draw.sameLinkTitle}</h2>
          <p className="text-[13px] text-muted-foreground">
            {t.draw.sameLinkBody}
          </p>
        </Card>
      )}
      {wishlists}
      {!repeated && (
        <p className="text-center text-[13px] text-muted-foreground">
          {t.draw.closedNote}
        </p>
      )}
    </PageLayout>
  );
}
