import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Círculo de 32 px con una inicial o un número. Es decorativo: el nombre
// siempre aparece en texto al lado.
const avatarVariants = cva(
  'flex size-8 flex-none items-center justify-center rounded-full text-[13px] font-bold',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        // Miembro de una pareja.
        pair: 'border-2 border-primary bg-card',
        // Ya ha visto su resultado (con un icono de check dentro).
        seen: 'bg-success text-success-foreground',
        // Aún no lo ha visto: círculo discontinuo.
        pending: 'border-2 border-dashed border-muted-foreground bg-card',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Avatar({
  className,
  variant,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof avatarVariants>) {
  return (
    <span
      aria-hidden="true"
      className={cn(avatarVariants({ variant }), className)}
      {...props}
    />
  );
}
