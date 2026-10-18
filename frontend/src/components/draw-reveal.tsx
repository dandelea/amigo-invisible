import type { ReactNode } from 'react';
import { Gift, RefreshCw } from 'lucide-react';
import type { Assignment, Room } from '@/api/types';
import { CopyLinkBox } from '@/components/copy-link-box';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { WishlistContent } from '@/components/wishlist';
import { initialOf } from '@/lib/format';
import { personalUrl } from '@/lib/links';
import { roomSummary } from '@/lib/room';
import { t } from '@/texts/es';

// Tarjeta para descubrir el resultado (mockups «Ya se ha sorteado» y
// «Sorteo repetido»). La ruleta no arranca sola: empieza al pulsar.
export function RevealCard({
  name,
  repeated,
  onDiscover,
}: {
  name: string;
  repeated: boolean;
  onDiscover: () => void;
}) {
  return (
    <Card
      variant="accent"
      className="items-center gap-2.5 px-4.5 py-6 text-center"
    >
      <span className="flex size-16 items-center justify-center rounded-full border-2 border-primary bg-card text-primary">
        <Gift aria-hidden="true" className="size-7.5" />
      </span>
      <h2 className="text-[22px] font-semibold text-accent-foreground">
        {repeated ? t.draw.newTitle : t.draw.doneTitle}
      </h2>
      <p className="text-[15px] text-muted-foreground">
        {repeated ? t.draw.newBody(name) : t.draw.doneBody(name)}
      </p>
      <Button
        variant="primary"
        size="lg"
        className="w-full whitespace-normal"
        onClick={onDiscover}
      >
        {repeated ? t.draw.discoverNew : t.draw.discover}
      </Button>
    </Card>
  );
}

export function RepeatedNotice() {
  return (
    <Alert role="alert" className="flex items-start gap-2.5 text-sm">
      <RefreshCw aria-hidden="true" className="mt-0.5 size-5 flex-none" />
      <span>
        <b>{t.draw.repeatedStrong}</b> {t.draw.repeated}
      </span>
    </Alert>
  );
}

// Resultado del participante (mockup «Resultado»): su amigo invisible, la
// lista de deseos de esa persona y el recordatorio de guardar su enlace.
export function DrawResult({
  token,
  me,
  room,
  assignment,
  children,
}: {
  token: string;
  me: string;
  room: Room;
  assignment: Assignment;
  // Se muestra antes de la nota final (p. ej. «Mi lista de deseos»).
  children?: ReactNode;
}) {
  const { receiver } = assignment;
  return (
    <div className="flex flex-col gap-3.5">
      <Pill>{t.draw.resultTag}</Pill>
      <h1 className="text-[28px] leading-tight font-bold">
        {t.draw.resultTitle(me)}
      </h1>
      <Card
        variant="accent"
        className="items-center p-6 text-center"
        aria-live="polite"
      >
        <span
          aria-hidden="true"
          className="flex size-18 items-center justify-center rounded-full border-2 border-primary bg-card text-[30px] font-bold text-primary"
        >
          {initialOf(receiver.name)}
        </span>
        <p className="text-[38px] leading-tight font-bold break-words text-accent-foreground">
          <span className="sr-only">
            {t.draw.resultAnnounce(receiver.name)}
          </span>
          <span aria-hidden="true">{receiver.name}</span>
        </p>
        <p className="text-[13px] text-muted-foreground">
          {[room.name, roomSummary(room)].filter(Boolean).join(' · ')}
        </p>
      </Card>
      <Card>
        <h2 className="text-[17px] font-semibold">
          {t.wishlist.of(receiver.name)}
        </h2>
        {receiver.wishlist ? (
          <WishlistContent
            token={token}
            participantId={receiver.id}
            wishlist={receiver.wishlist}
          />
        ) : (
          <p className="text-[13px] text-muted-foreground">
            {t.draw.noWishlist(receiver.name)}
          </p>
        )}
      </Card>
      <Card>
        <h2 className="text-[17px] font-semibold">
          {t.participant.savePersonalTitle}
        </h2>
        <p className="text-[13px] text-muted-foreground">
          {t.participant.savePersonalBody}
        </p>
        <CopyLinkBox url={personalUrl(token)} primary />
      </Card>
      {children}
      <p className="text-center text-[13px] text-muted-foreground">
        {t.draw.onlyFirstTime}
      </p>
    </div>
  );
}
