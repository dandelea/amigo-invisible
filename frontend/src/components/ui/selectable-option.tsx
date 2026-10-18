import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Fila seleccionable con casilla (p. ej. para elegir las dos personas de una
// pareja). La fila entera es la etiqueta, así que todo es pulsable.
export function SelectableOption({
  label,
  note,
  checked,
  disabled,
  onChange,
}: {
  label: string
  note?: ReactNode
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      className={cn(
        'flex min-h-13 cursor-pointer items-center gap-3 rounded-lg border px-3',
        checked ? 'border-2 border-primary bg-accent' : 'border-border bg-card',
        disabled && 'cursor-not-allowed opacity-55',
      )}
    >
      <input
        type="checkbox"
        className="size-[22px] flex-none accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="flex-1 font-bold break-words">{label}</span>
      {note && <span className="text-[13px] text-muted-foreground">{note}</span>}
    </label>
  )
}
