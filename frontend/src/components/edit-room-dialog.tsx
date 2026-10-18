import { useState, type FormEvent } from 'react'
import { ApiError } from '@/api/client'
import { updateRoom } from '@/api/rooms'
import type { Room, UpdateRoomInput } from '@/api/types'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import {
  parseRoomForm,
  serverFieldErrors,
  useRoomForm,
} from '@/hooks/use-room-form'
import { errorText, t } from '@/texts/es'
import { RoomFields } from './room-form'

// El campo numérico usa punto decimal; el navegador lo muestra según el idioma.
const budgetText = (budget: number | null) =>
  budget == null ? '' : String(budget)

// Editar nombre, fecha y presupuesto. Solo se envían los campos que han
// cambiado (así una fecha ya pasada que no se toca no impide guardar).
export function EditRoomDialog({
  open,
  onOpenChange,
  token,
  room,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  room: Room
  onSaved?: (room: Room) => void
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.organizer.editTitle}
    >
      {/* Se monta de nuevo en cada apertura, con los datos actuales. */}
      {open && (
        <EditRoomForm
          token={token}
          room={room}
          onDone={(saved) => {
            onSaved?.(saved)
            onOpenChange(false)
          }}
        />
      )}
    </ResponsiveDialog>
  )
}

function EditRoomForm({
  token,
  room,
  onDone,
}: {
  token: string
  room: Room
  onDone: (room: Room) => void
}) {
  const initial = {
    name: room.name,
    giftDate: room.giftDate ?? '',
    budget: budgetText(room.budget),
  }
  const form = useRoomForm(initial)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const { errors, parsed } = parseRoomForm(form.values)
    // Una fecha que no se ha tocado no se valida (puede haber pasado ya).
    if (form.values.giftDate === initial.giftDate) delete errors.giftDate
    form.setErrors(errors)
    if (Object.keys(errors).length > 0) return
    const changes: UpdateRoomInput = {}
    if (parsed.name !== room.name) changes.name = parsed.name
    if (form.values.giftDate !== initial.giftDate)
      changes.giftDate = parsed.giftDate
    if (parsed.budget !== room.budget) changes.budget = parsed.budget
    if (Object.keys(changes).length === 0) return onDone(room)
    setSaving(true)
    setServerError(null)
    try {
      onDone(await updateRoom(token, changes))
    } catch (error) {
      const fields = serverFieldErrors(error)
      if (fields) {
        form.setErrors(fields)
      } else {
        const err = error instanceof ApiError ? error : null
        setServerError(errorText(err?.code ?? 'UNKNOWN', err?.message))
      }
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
      <RoomFields values={form.values} errors={form.errors} set={form.set} />
      {serverError && <Alert variant="error">{serverError}</Alert>}
      <Button type="submit" variant="primary" size="lg" disabled={saving}>
        {saving ? t.organizer.saving : t.organizer.save}
      </Button>
    </form>
  )
}
