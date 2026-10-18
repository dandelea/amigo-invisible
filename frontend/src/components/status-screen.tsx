import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { PageLayout } from './page-layout';
import { usePageTitle } from '@/hooks/use-page-title';

// Pantalla de estado (sala llena, cerrada, no encontrado, sin salas,
// cargando…): una tarjeta centrada con título, texto y acción opcional.
export function StatusScreen({
  title,
  body,
  spinner,
  action,
}: {
  title: string;
  body?: string;
  spinner?: boolean;
  action?: ReactNode;
}) {
  usePageTitle(title);
  return (
    <PageLayout className="justify-center">
      <Card
        className="mx-auto w-full max-w-[460px] items-center p-5 text-center"
        role={spinner ? 'status' : undefined}
      >
        {spinner && (
          <div
            aria-hidden="true"
            className="size-7 animate-spin rounded-full border-4 border-border border-t-primary motion-reduce:animate-none"
          />
        )}
        <h1 className="text-[17px] font-semibold">{title}</h1>
        {body && <p className="text-[13px] text-muted-foreground">{body}</p>}
        {action}
      </Card>
    </PageLayout>
  );
}
