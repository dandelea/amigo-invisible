import { useState } from 'react'
import { EllipsisVertical } from 'lucide-react'
import { expelParticipant } from '@/api/rooms'
import type { Participant } from '@/api/types'
import { ActionSheetItem } from '@/components/ui/action-sheet-item'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { IconButton } from '@/components/ui/icon-button'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { t } from '@/texts/es'

// Botón ⋮ de un participante en el panel del organizador, con su menú de
// acciones (mockup «Acciones de participante») y la confirmación de
// expulsar. «Regenerar enlace» se añade en la Fase 4.
export function ParticipantActions({
  token,
  participant,
}: {
  token: string
  participant: Participant
}) {
  const [menu, setMenu] = useState(false)
  const [confirmExpel, setConfirmExpel] = useState(false)

  return (
    <>
      <IconButton
        label={t.organizer.actions(participant.name)}
        tooltip={t.organizer.actionsTooltip}
        onClick={() => setMenu(true)}
      >
        <EllipsisVertical aria-hidden="true" />
      </IconButton>
      <ResponsiveDialog
        open={menu}
        onOpenChange={setMenu}
        title={participant.name}
      >
        <ActionSheetItem
          destructive
          title={t.organizer.expel}
          description={t.organizer.expelHint}
          onClick={() => {
            setMenu(false)
            setConfirmExpel(true)
          }}
        />
      </ResponsiveDialog>
      <ConfirmDialog
        open={confirmExpel}
        onOpenChange={setConfirmExpel}
        title={t.organizer.expelTitle(participant.name)}
        body={t.organizer.expelBody}
        confirmLabel={t.organizer.expelConfirm}
        destructive
        onConfirm={() => expelParticipant(token, participant.id)}
      />
    </>
  )
}
