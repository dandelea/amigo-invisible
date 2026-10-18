import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

// Opción de un menú de acciones: título y una línea de explicación.
export function ActionSheetItem({
  title,
  description,
  destructive,
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, 'children' | 'variant'> & {
  title: string
  description: string
  destructive?: boolean
}) {
  return (
    <Button
      variant={destructive ? 'destructive' : 'secondary'}
      className={cn(
        'min-h-15 w-full flex-col items-start justify-center gap-0.5 py-2 text-left whitespace-normal',
        className,
      )}
      {...props}
    >
      <span>{title}</span>
      <span className="text-[13px] font-normal text-muted-foreground">
        {description}
      </span>
    </Button>
  )
}
