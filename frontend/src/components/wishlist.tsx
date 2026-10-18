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
