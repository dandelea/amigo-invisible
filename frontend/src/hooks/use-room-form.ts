import { useState } from 'react'
import { ApiError } from '@/api/client'
import { todayIso } from '@/lib/format'
import { cleanName, ROOM_NAME_PATTERN } from '@/lib/names'
import { t } from '@/texts/es'

// Estado y validación del formulario de la sala (crear y editar).

export interface RoomFormValues {
  name: string
  giftDate: string
  budget: string
  // El navegador marca como inválido lo que no es un número en un campo
  // numérico (y su valor llega vacío): hay que avisar igualmente.
  budgetInvalid?: boolean
}

export interface RoomFormErrors {
  name?: string
  giftDate?: string
  budget?: string
}

export interface ParsedRoom {
  name: string
  giftDate: string | null
  budget: number | null
}

// Último día permitido para la entrega: dentro de 2 años, como en el backend.
export function maxGiftDate(now = new Date()): string {
  const [y, m, d] = todayIso(now).split('-')
  return `${Number(y) + 2}-${m}-${d}`
}

// Las mismas reglas que valida el backend, para avisar antes de enviar.
// Una fecha o un presupuesto vacíos se devuelven como null.
export function parseRoomForm(values: RoomFormValues): {
  errors: RoomFormErrors
  parsed: ParsedRoom
} {
  const e = t.create.errors
  const errors: RoomFormErrors = {}
  const parsed: ParsedRoom = {
    name: cleanName(values.name),
    giftDate: values.giftDate || null,
    budget: null,
  }
  if (Array.from(parsed.name).length < 3) errors.name = e.nameShort
  else if (!ROOM_NAME_PATTERN.test(parsed.name)) errors.name = e.nameChars

  if (parsed.giftDate && parsed.giftDate < todayIso()) errors.giftDate = e.datePast
  else if (parsed.giftDate && parsed.giftDate > maxGiftDate())
    errors.giftDate = e.dateFar

  const budget = values.budget.trim().replace(',', '.')
  if (values.budgetInvalid) errors.budget = e.budgetNumber
  else if (budget) {
    const value = Number(budget)
    if (!Number.isFinite(value)) errors.budget = e.budgetNumber
    else if (value < 1) errors.budget = e.budgetMin
    else if (value > 1000) errors.budget = e.budgetMax
    else if (!/^\d+(\.\d{1,2})?$/.test(budget)) errors.budget = e.budgetDecimals
    else parsed.budget = value
  }
  return { errors, parsed }
}

// Errores del servidor (VALIDATION_ERROR) para los campos del formulario, o
// null si el error no es de un campo concreto.
export function serverFieldErrors(error: unknown): RoomFormErrors | null {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_ERROR') {
    return null
  }
  const { name, giftDate, budget } = error.fields
  const found = Object.fromEntries(
    Object.entries({ name, giftDate, budget }).filter(([, v]) => v),
  ) as RoomFormErrors
  return Object.keys(found).length > 0 ? found : null
}

export function useRoomForm(initial?: Partial<RoomFormValues>) {
  const [values, setValues] = useState<RoomFormValues>({
    name: '',
    giftDate: '',
    budget: '',
    ...initial,
  })
  const [errors, setErrors] = useState<RoomFormErrors>({})
  const set =
    (field: 'name' | 'giftDate' | 'budget') =>
    (value: string, invalid = false) => {
      setValues((v) => ({
        ...v,
        [field]: value,
        ...(field === 'budget' && { budgetInvalid: invalid }),
      }))
      // El error de un campo se borra al editarlo; se vuelve a validar al enviar.
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  return { values, set, errors, setErrors }
}
