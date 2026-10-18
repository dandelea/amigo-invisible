import type { ComponentProps } from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

// Interruptor de los mockups (56 × 32 px dentro de un objetivo de 44 px).
// El estado se indica siempre también con texto al lado.
function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-[3px] outline-none transition-colors after:absolute after:-inset-y-1.5 after:-inset-x-0 focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[26px] rounded-full bg-card shadow-sm transition-transform data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
