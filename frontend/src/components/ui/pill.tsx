import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Etiqueta pequeña: «Opcional», «Tú», «Abierta · 5/30», «Privado»…
const pillVariants = cva(
  'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-secondary text-foreground',
        accent: 'bg-accent-strong text-accent-foreground',
        warning: 'bg-warning text-warning-foreground',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export function Pill({
  className,
  variant,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof pillVariants>) {
  return (
    <span className={cn(pillVariants({ variant }), className)} {...props} />
  )
}
