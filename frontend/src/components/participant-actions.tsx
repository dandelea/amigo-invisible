import { useState } from 'react';
import { EllipsisVertical } from 'lucide-react';
import { expelParticipant, regenerateParticipantToken } from '@/api/rooms';
import type { Participant } from '@/api/types';
import { CopyLinkBox } from '@/components/copy-link-box';
import { ActionSheetItem } from '@/components/ui/action-sheet-item';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { personalUrl } from '@/lib/links';
import { t } from '@/texts/es';

type Step = 'none' | 'menu' | 'regenerate' | 'newLink' | 'expel';

// Botón ⋮ de un participante en el panel del organizador, con su menú
// (mockup «Acciones de participante»): regenerar el enlace personal, en
// cualquier momento, y expulsar, solo antes del sorteo.
export function ParticipantActions({
  token,
  participant,
  canExpel,
}: {
  token: string;
  participant: Participant;
  canExpel: boolean;
}) {
  const [step, setStep] = useState<Step>('none');
  const [newToken, setNewToken] = useState<string | null>(null);
  const close = () => setStep('none');
  // Cierra un paso solo si sigue siendo el actual: ConfirmDialog avisa del
  // cierre después de confirmar, cuando ya se ha pasado al paso siguiente.
  const closeIf = (current: Step) => (open: boolean) => {
    if (!open) setStep((s) => (s === current ? 'none' : s));
  };

  return (
    <>
      <IconButton
        label={t.organizer.actions(participant.name)}
        tooltip={t.organizer.actionsTooltip}
        onClick={() => setStep('menu')}
      >
        <EllipsisVertical aria-hidden="true" />
      </IconButton>
      <ResponsiveDialog
        open={step === 'menu'}
        onOpenChange={closeIf('menu')}
        title={participant.name}
      >
        <ActionSheetItem
          title={t.draw.regenerate}
          description={t.draw.regenerateHint}
          onClick={() => setStep('regenerate')}
        />
        {canExpel && (
          <ActionSheetItem
            destructive
            title={t.organizer.expel}
            description={t.organizer.expelHint}
            onClick={() => setStep('expel')}
          />
        )}
      </ResponsiveDialog>
      <ConfirmDialog
        open={step === 'regenerate'}
        onOpenChange={closeIf('regenerate')}
        title={t.draw.regenerateTitle(participant.name)}
        body={t.draw.regenerateBody(participant.name)}
        confirmLabel={t.draw.regenerateConfirm}
        onConfirm={async () => {
          const { participantToken } = await regenerateParticipantToken(
            token,
            participant.id,
          );
          setNewToken(participantToken);
          setStep('newLink');
        }}
      />
      {/* El nuevo enlace se muestra una sola vez. */}
      <ResponsiveDialog
        open={step === 'newLink'}
        onOpenChange={(open) => {
          if (!open) {
            setNewToken(null);
            close();
          }
        }}
        title={t.draw.newLinkTitle(participant.name)}
        description={t.draw.newLinkBody}
        showClose={false}
      >
        {newToken && <CopyLinkBox url={personalUrl(newToken)} primary />}
        <Alert>
          <b>{t.draw.newLinkOnceStrong}</b>{' '}
          {t.draw.newLinkOnce(participant.name)}
        </Alert>
        <Button
          onClick={() => {
            setNewToken(null);
            close();
          }}
        >
          {t.draw.done}
        </Button>
      </ResponsiveDialog>
      <ConfirmDialog
        open={step === 'expel'}
        onOpenChange={closeIf('expel')}
        title={t.organizer.expelTitle(participant.name)}
        body={t.organizer.expelBody}
        confirmLabel={t.organizer.expelConfirm}
        destructive
        onConfirm={() => expelParticipant(token, participant.id)}
      />
    </>
  );
}
