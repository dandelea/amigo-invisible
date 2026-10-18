import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '@/api/client'
import { createRoom } from '@/api/rooms'
import type { CreateRoomInput } from '@/api/types'
import { PageLayout } from '@/components/page-layout'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { todayIso } from '@/lib/format'
import { cleanName, ROOM_NAME_MAX, ROOM_NAME_PATTERN } from '@/lib/names'
import { errorText, t } from '@/texts/es'

interface FieldErrors {
  name?: string
  giftDate?: string
  budget?: string
}

// Las mismas reglas que valida el backend, para avisar antes de enviar.
function validate(name: string, giftDate: string, budget: string) {
  const errors: FieldErrors = {}
  const input: CreateRoomInput = { name: cleanName(name) }
  if (Array.from(input.name).length < 3) errors.name = t.create.errors.nameShort
  else if (!ROOM_NAME_PATTERN.test(input.name))
    errors.name = t.create.errors.nameChars
  if (giftDate) {
    if (giftDate < todayIso()) errors.giftDate = t.create.errors.datePast
    else input.giftDate = giftDate
  }
  if (budget.trim()) {
    const normalized = budget.trim().replace(',', '.')
    const value = Number(normalized)
    if (
      !/^\d+(\.\d{1,2})?$/.test(normalized) ||
      value < 1 ||
      value > 1000
    ) {
      errors.budget = t.create.errors.budget
    } else {
      input.budget = value
    }
  }
  return { errors, input }
}

export function CreateRoomPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [giftDate, setGiftDate] = useState('')
  const [budget, setBudget] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const { errors: found, input } = validate(name, giftDate, budget)
    setErrors(found)
    setServerError(null)
    if (Object.keys(found).length > 0) return
    setSubmitting(true)
    try {
      const created = await createRoom(input)
      navigate('/creada', { state: created })
    } catch (error) {
      const err = error instanceof ApiError ? error : null
      setServerError(errorText(err?.code ?? 'UNKNOWN', err?.message))
      setSubmitting(false)
    }
  }

  return (
    <PageLayout>
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-1 flex-col gap-3.5 lg:mx-auto lg:w-full lg:max-w-[560px] lg:flex-none lg:rounded-xl lg:border lg:bg-card lg:p-7"
      >
        <h1 className="text-2xl font-bold">{t.create.title}</h1>
        <FormField
          label={t.create.name}
          hint={t.create.nameHint}
          error={errors.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={ROOM_NAME_MAX}
          showCounter
          autoComplete="off"
          required
        />
        <FormField
          label={t.create.giftDate}
          optionalLabel={t.create.optional}
          error={errors.giftDate}
          type="date"
          min={todayIso()}
          value={giftDate}
          onChange={(e) => setGiftDate(e.target.value)}
        />
        <FormField
          label={t.create.budget}
          optionalLabel={t.create.optional}
          hint={t.create.budgetHint}
          error={errors.budget}
          inputMode="decimal"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          autoComplete="off"
        />
        <Card variant="muted">
          <p className="text-[13px] text-muted-foreground">{t.create.note}</p>
        </Card>
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="mt-auto lg:mt-2"
          disabled={submitting}
        >
          {submitting ? t.create.submitting : t.create.submit}
        </Button>
      </form>
    </PageLayout>
  )
}
