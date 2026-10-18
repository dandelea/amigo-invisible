import { useState } from 'react';
import { Gift } from 'lucide-react';
import { ApiError } from '@/api/client';
import { getWishlistDownloadUrl } from '@/api/rooms';
import type { ParticipantWithWishlist, Wishlist } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { Pill } from '@/components/ui/pill';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { goToUrl } from '@/lib/navigation';
import { fileLabel } from '@/lib/wishlist';
import { errorText, t } from '@/texts/es';

// Botón de regalo de cada participante con lista, o «Sin lista».
export function WishlistButton({
  token,
  participant,
}: {
  token: string;
  participant: ParticipantWithWishlist;
}) {
  const [open, setOpen] = useState(false);
  if (!participant.wishlist) {
    return (
      <span className="text-[13px] text-muted-foreground">
        {t.participant.noWishlist}
      </span>
    );
  }
  return (
    <>
      <IconButton
        size="icon-sm"
        label={t.participant.seeWishes(participant.name)}
        tooltip={t.participant.seeWishesTooltip}
        onClick={() => setOpen(true)}
      >
        <Gift aria-hidden="true" />
      </IconButton>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={t.wishlist.of(participant.name)}
      >
        <WishlistContent
          token={token}
          participantId={participant.id}
          wishlist={participant.wishlist}
        />
      </ResponsiveDialog>
    </>
  );
}

// El elemento de una lista: enlace (se abre en otra pestaña) o archivo (se
// descarga con una URL firmada que se pide en el momento).
export function WishlistContent({
  token,
  participantId,
  wishlist,
}: {
  token: string;
  participantId: string;
  wishlist: Wishlist;
}) {
  const { busy, error, download } = useDownload(token, participantId);

  if (wishlist.kind === 'link' && wishlist.url) {
    return (
      <Card>
        <Pill>{t.wishlist.link}</Pill>
        <p className="font-semibold break-all">{wishlist.url}</p>
        <Button asChild variant="primary">
          <a href={wishlist.url} target="_blank" rel="noopener noreferrer">
            {t.wishlist.openLink}
          </a>
        </Button>
        <p className="text-[13px] text-muted-foreground">
          {t.wishlist.opensNewTab}
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <Pill>{wishlist.fileType}</Pill>
      <p className="font-semibold break-all">{fileLabel(wishlist)}</p>
      <Button variant="primary" onClick={download} disabled={busy}>
        {busy ? t.wishlist.downloading : t.wishlist.download}
      </Button>
      {error && <Alert variant="error">{error}</Alert>}
    </Card>
  );
}

// Descarga del archivo de deseos de alguien de la sala (URL firmada que se
// pide en el momento).
function useDownload(token: string, participantId: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function download() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await getWishlistDownloadUrl(token, participantId);
      goToUrl(url);
    } catch (e) {
      setError(
        e instanceof ApiError ? errorText(e.code, e.message) : t.errors.default,
      );
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, download };
}

// Botón «Ver listas de deseos» con un listado sencillo de las listas de los
// demás participantes. Se usa en la sala después del sorteo.
export function AllWishlistsButton({
  token,
  participants,
  meId,
}: {
  token: string;
  participants: ParticipantWithWishlist[];
  meId: string;
}) {
  const [open, setOpen] = useState(false);
  const others = participants.filter((p) => p.id !== meId);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Gift aria-hidden="true" />
        {t.wishlist.viewAll}
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={t.wishlist.allTitle}
        description={t.wishlist.allHint}
      >
        <ul>
          {others.map((p) => (
            <WishlistRow key={p.id} token={token} participant={p} />
          ))}
        </ul>
      </ResponsiveDialog>
    </>
  );
}

function WishlistRow({
  token,
  participant,
}: {
  token: string;
  participant: ParticipantWithWishlist;
}) {
  const { busy, error, download } = useDownload(token, participant.id);
  const w = participant.wishlist;
  return (
    <li className="flex flex-col gap-1.5 border-b border-muted py-2.5 last:border-b-0">
      <div className="flex min-h-11 items-center gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <b className="break-words">{participant.name}</b>
          <span className="truncate text-[13px] text-muted-foreground">
            {!w
              ? t.participant.noWishlist
              : w.kind === 'link'
                ? w.url
                : fileLabel(w)}
          </span>
        </div>
        {w?.kind === 'link' && w.url && (
          <Button asChild>
            <a
              href={w.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t.wishlist.openLink}: ${t.wishlist.of(participant.name)}`}
            >
              {t.wishlist.openShort}
            </a>
          </Button>
        )}
        {w?.kind === 'file' && (
          <Button
            onClick={download}
            disabled={busy}
            aria-label={`${t.wishlist.download}: ${t.wishlist.of(participant.name)}`}
          >
            {t.wishlist.downloadShort}
          </Button>
        )}
      </div>
      {error && <Alert variant="error">{error}</Alert>}
    </li>
  );
}
