import { useServerWaking } from '@/api/server-status';
import { Card } from '@/components/ui/card';
import { t } from '@/texts/es';

// Aviso «Despertando el servidor» encima de la página mientras el backend
// arranca. Es una capa: la página de debajo sigue montada y no se pierde
// lo que se estaba escribiendo.
export function WakingOverlay() {
  const waking = useServerWaking();
  if (!waking) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 p-5">
      <Card
        role="status"
        aria-live="polite"
        className="w-full max-w-[460px] items-center p-5 text-center"
      >
        <div
          aria-hidden="true"
          className="size-7 animate-spin rounded-full border-4 border-border border-t-primary motion-reduce:animate-none"
        />
        <h1 className="text-[17px] font-semibold">{t.status.waking.title}</h1>
        <p className="text-[13px] text-muted-foreground">
          {t.status.waking.body}
        </p>
      </Card>
    </div>
  );
}
