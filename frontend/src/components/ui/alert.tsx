import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('rounded-lg border px-3 py-2.5 text-[13px]', {
  variants: {
    variant: {
      warning: 'border-warning-border bg-warning text-warning-foreground',
      error: 'border-pair-border bg-accent text-destructive',
      success: 'border-success bg-success text-success-foreground',
    },
  },
  defaultVariants: { variant: 'warning' },
});

// Aviso en línea. Los errores se anuncian a los lectores de pantalla.
export function Alert({
  className,
  variant,
  role,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role={role ?? (variant === 'error' ? 'alert' : undefined)}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}
