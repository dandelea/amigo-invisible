import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Tarjeta de los mockups: radio de 12 px, borde suave y separación de 8 px.
const cardVariants = cva('flex flex-col gap-2 rounded-xl border p-3.5', {
  variants: {
    variant: {
      default: 'border-border bg-card',
      // Borde de acento de 2 px (p. ej. el enlace de invitación).
      highlighted: 'border-2 border-primary bg-card',
      // Fondo gris para notas.
      muted: 'border-border bg-background',
      // Fondo rosado con borde de acento (resultado, sorteo hecho).
      accent: 'border-2 border-primary bg-accent',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function Card({
  className,
  variant,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof cardVariants>) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />
}
