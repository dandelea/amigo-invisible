import type { ReactNode } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';
import { t } from '@/texts/es';
import { Button } from './button';

// Diálogo de los mockups: hoja inferior en móvil y cuadro centrado de 460 px
// desde tablet. Radix se encarga de atrapar el foco, cerrar con Escape y
// devolver el foco al botón que lo abrió.
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  showClose = true,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  // Botón «Cerrar» junto al título (las confirmaciones no lo llevan).
  showClose?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/55 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[90svh] flex-col gap-3 overflow-y-auto rounded-t-3xl bg-card p-5 text-foreground outline-none',
            'md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-full md:max-w-[460px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl',
            'data-open:animate-in data-open:slide-in-from-bottom-8 md:data-open:slide-in-from-bottom-0 md:data-open:zoom-in-95',
            className,
          )}
        >
          <div className="flex items-center justify-between gap-2.5">
            <DialogPrimitive.Title className="text-xl leading-tight font-semibold break-words">
              {title}
            </DialogPrimitive.Title>
            {showClose && (
              <DialogPrimitive.Close asChild>
                <Button>{t.dialog.close}</Button>
              </DialogPrimitive.Close>
            )}
          </div>
          {description ? (
            <DialogPrimitive.Description className="text-[13px] text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">
              {title}
            </DialogPrimitive.Description>
          )}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
