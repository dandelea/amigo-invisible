import { ToggleGroup } from 'radix-ui'
import { cn } from '@/lib/utils'

// Selector de dos o más opciones excluyentes (p. ej. Enlace / Archivo).
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      // Radix permite deseleccionar; aquí siempre hay una opción elegida.
      onValueChange={(next) => next && onChange(next as T)}
      aria-label={label}
      className="flex overflow-hidden rounded-lg border border-input"
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            'min-h-11 flex-1 bg-card px-4 text-[15px] font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
          )}
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
