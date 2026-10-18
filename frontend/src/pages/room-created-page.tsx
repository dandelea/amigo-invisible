import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import type { CreateRoomResponse } from '@/api/types';
import { CopyLinkBox } from '@/components/copy-link-box';
import { EditRoomDialog } from '@/components/edit-room-dialog';
import { PageLayout } from '@/components/page-layout';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { formatBudget, formatLongDate } from '@/lib/format';
import { inviteUrl, managePath, manageUrl } from '@/lib/links';
import { t } from '@/texts/es';
import { usePageTitle } from '@/hooks/use-page-title';

// Se llega aquí justo después de crear la sala. Los enlaces viajan en el
// estado de la navegación (en memoria): si se recarga, se vuelve al inicio,
// porque el enlace de gestión solo se muestra una vez.
export function RoomCreatedPage() {
  usePageTitle(t.created.title);
  const created = useLocation().state as CreateRoomResponse | null;
  // Los datos editados aquí se muestran al momento.
  const [room, setRoom] = useState(created?.room);
  const [editing, setEditing] = useState(false);
  if (!created?.manageToken || !room) return <Navigate to="/" replace />;
  const { inviteCode, manageToken } = created;

  return (
    <PageLayout>
      <h1 className="text-[28px] leading-tight font-bold">{t.created.title}</h1>
      <Card>
        <div className="flex items-center justify-between gap-2.5">
          <h2 className="text-[17px] font-semibold break-words">{room.name}</h2>
          <Button onClick={() => setEditing(true)}>{t.organizer.edit}</Button>
        </div>
        {room.giftDate && (
          <p className="text-[13px] text-muted-foreground">
            {t.created.giftDate(formatLongDate(room.giftDate))}
          </p>
        )}
        {room.budget != null && (
          <p className="text-[13px] text-muted-foreground">
            {t.created.budget(formatBudget(room.budget))}
          </p>
        )}
      </Card>
      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <Card variant="highlighted">
          <Pill variant="accent">{t.created.inviteTag}</Pill>
          <h2 className="text-[17px] font-semibold">{t.created.inviteTitle}</h2>
          <p className="text-[13px] text-muted-foreground">
            {t.created.inviteHint}
          </p>
          <CopyLinkBox url={inviteUrl(inviteCode)} primary />
        </Card>
        <Card>
          <Pill variant="warning">{t.created.manageTag}</Pill>
          <h2 className="text-[17px] font-semibold">{t.created.manageTitle}</h2>
          <Alert>
            <b>{t.created.manageWarningStrong}</b> {t.created.manageWarning}
          </Alert>
          <CopyLinkBox url={manageUrl(manageToken)} />
        </Card>
      </div>
      <Button asChild variant="secondary" className="lg:self-start">
        <Link to={managePath(manageToken)}>{t.created.goToRoom}</Link>
      </Button>
      <EditRoomDialog
        open={editing}
        onOpenChange={setEditing}
        token={manageToken}
        room={room}
        onSaved={setRoom}
      />
    </PageLayout>
  );
}
