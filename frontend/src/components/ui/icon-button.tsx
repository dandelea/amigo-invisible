import type { ComponentProps, ReactNode } from 'react'
import { Button } from './button'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

// Botón de solo icono (44 × 44 px, o 36 px visibles con `icon-sm`) con
// etiqueta accesible obligatoria y un tooltip con un texto corto. En móvil
// no hay hover: la etiqueta es lo que cuenta para los lectores de pantalla.
export function IconButton({
  label,
  tooltip,
  children,
  size = 'icon',
  ...props
}: Omit<ComponentProps<typeof Button>, 'size' | 'aria-label'> & {
  label: string
  tooltip: string
  children: ReactNode
  size?: 'icon' | 'icon-sm'
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size={size} aria-label={label} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-xs font-semibold">{tooltip}</TooltipContent>
    </Tooltip>
  )
}
