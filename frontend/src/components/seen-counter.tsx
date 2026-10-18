import { useState } from 'react';
import { Check } from 'lucide-react';
import type { OrganizerDraw } from '@/api/types';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { t } from '@/texts/es';

// Contador «Resultados vistos» del organizador, con el botón «Más» que abre
// la lista de quién lo ha visto. Solo hay nombres y estados: el organizador
// nunca ve a quién le ha tocado cada persona.
export function SeenCounter({ draw }: { draw: OrganizerDraw }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <div className="flex items-center justify-between gap-2.5">
        <h2 className="text-[17px] font-semibold">{t.draw.seenTitle}</h2>
        <Button
          className="px-4.5"
          aria-label={t.draw.moreLabel}
          onClick={() => setOpen(true)}
        >
          {t.draw.more}
        </Button>
      </div>
      <p className="text-[34px] leading-none font-bold">
        {draw.seenCount}{' '}
        <span className="text-base font-normal text-muted-foreground">
          {t.draw.seenOf(draw.total)}
        </span>
      </p>
      <ProgressBar
        value={draw.seenCount}
        max={draw.total}
        label={t.draw.seenProgress(draw.seenCount, draw.total)}
      />
      <p className="text-[13px] text-muted-foreground">{t.draw.seenHint}</p>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={t.draw.seenTitle}
        description={t.draw.seenDialogHint}
      >
        <SeenList entries={draw.seen} />
      </ResponsiveDialog>
    </Card>
  );
}

// Dos grupos, «Han visto» y «Pendientes». Cada nombre lleva su estado en
// texto, además del icono, para no depender del color.
export function SeenList({
  entries,
}: {
  entries: { name: string; seen: boolean }[];
}) {
  const seen = entries.filter((e) => e.seen);
  const pending = entries.filter((e) => !e.seen);
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="mt-1.5 text-[17px] font-semibold">
        {t.draw.seenGroup(seen.length)}
      </h3>
      <ul>
        {seen.map((e) => (
          <SeenRow key={e.name} name={e.name} seen />
        ))}
      </ul>
      <h3 className="mt-1.5 text-[17px] font-semibold">
        {t.draw.pendingGroup(pending.length)}
      </h3>
      <ul>
        {pending.map((e) => (
          <SeenRow key={e.name} name={e.name} seen={false} />
        ))}
      </ul>
    </div>
  );
}

function SeenRow({ name, seen }: { name: string; seen: boolean }) {
  return (
    <li className="flex min-h-12 items-center gap-2.5 border-b border-muted last:border-b-0">
      <Avatar variant={seen ? 'seen' : 'pending'}>
        {seen && <Check className="size-4" strokeWidth={3} />}
      </Avatar>
      <b className="flex-1 break-words">{name}</b>
      <span className="text-[13px] text-muted-foreground">
        {seen ? t.draw.seenState : t.draw.pendingState}
      </span>
    </li>
  );
}
