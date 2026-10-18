import { useState } from 'react'
import { ApiError } from '@/api/client'
import { createPair } from '@/api/rooms'
import type { Pair, Participant } from '@/api/types'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { SelectableOption } from '@/components/ui/selectable-option'
import { errorText, t } from '@/texts/es'

// Elegir a dos personas sin pareja (mockup «Marcar pareja»).
export function MarkPairDialog({
  open,
  onOpenChange,
  token,
  participants,
  pairs,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  participants: Participant[]
  pairs: Pair[]
}) {
  const [chosen, setChosen] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const paired = new Set(pairs.flatMap((p) => p.participantIds))

  function close(next: boolean) {
    if (saving) return
    if (!next) {
      setChosen([])
      setError(null)
    }
    onOpenChange(next)
  }

  function toggle(id: string, checked: boolean) {
    setChosen((c) => (checked ? [...c, id] : c.filter((x) => x !== id)))
  }

  async function confirm() {
    if (chosen.length !== 2) return
    setSaving(true)
    setError(null)
    try {
      await createPair(token, [chosen[0], chosen[1]])
      setSaving(false)
      close(false)
    } catch (e) {
      setError(
        e instanceof ApiError ? errorText(e.code, e.message) : t.errors.default,
      )
      setSaving(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={close}
      title={t.organizer.markPair}
      description={t.organizer.markPairHint}
    >
      <div className="flex flex-col gap-2">
        {participants.map((p) => {
          const isPaired = paired.has(p.id)
          const isChosen = chosen.includes(p.id)
          return (
            <SelectableOption
              key={p.id}
              label={p.name}
              note={isPaired ? t.organizer.alreadyPaired : undefined}
              checked={isChosen}
              disabled={isPaired || (!isChosen && chosen.length >= 2)}
              onChange={(checked) => toggle(p.id, checked)}
            />
          )
        })}
      </div>
      <p className="text-[13px] font-semibold text-muted-foreground" aria-live="polite">
        {t.organizer.chosen(chosen.length)}
      </p>
      {error && <Alert variant="error">{error}</Alert>}
      <Button
        variant="primary"
        size="lg"
        disabled={chosen.length !== 2 || saving}
        onClick={confirm}
      >
        {t.organizer.confirmPair}
      </Button>
      <Button onClick={() => close(false)} disabled={saving}>
        {t.dialog.cancel}
      </Button>
    </ResponsiveDialog>
  )
}
