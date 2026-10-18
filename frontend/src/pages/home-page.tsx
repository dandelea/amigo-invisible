import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getAvailability } from '@/api/rooms';
import { PageLayout } from '@/components/page-layout';
import { StepCard } from '@/components/step-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { t } from '@/texts/es';
import { usePageTitle } from '@/hooks/use-page-title';

export function HomePage() {
  usePageTitle(null);
  // null mientras no se sabe (o si falla la consulta): se deja intentar y
  // la pantalla de crear sala informa del error si lo hay.
  const [canCreate, setCanCreate] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    getAvailability()
      .then((r) => active && setCanCreate(r.canCreateRoom))
      .catch(() => active && setCanCreate(null));
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageLayout>
      <div className="flex flex-1 flex-col gap-3.5 lg:mt-6 lg:grid lg:flex-none lg:grid-cols-2 lg:items-center lg:gap-8">
        <div className="flex flex-1 flex-col justify-center gap-3.5">
          <h1 className="text-[28px] leading-tight font-bold lg:text-[40px]">
            {t.appName}
          </h1>
          <p className="text-base text-muted-foreground">{t.home.tagline}</p>
          <div className="hidden lg:block">
            <CreateAction canCreate={canCreate} />
          </div>
        </div>
        <ol className="flex flex-col gap-3.5">
          {t.home.steps.map((step, i) => (
            <li key={step.title}>
              <StepCard step={i + 1} title={step.title} body={step.body} />
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-2 lg:hidden">
        <CreateAction canCreate={canCreate} />
      </div>
    </PageLayout>
  );
}

function CreateAction({ canCreate }: { canCreate: boolean | null }) {
  if (canCreate === false) {
    return (
      <Card className="items-center p-5 text-center" role="status">
        <h2 className="text-[17px] font-semibold">{t.status.noRooms.title}</h2>
        <p className="text-[13px] text-muted-foreground">
          {t.status.noRooms.body}
        </p>
      </Card>
    );
  }
  return (
    <Button asChild variant="primary" size="lg" className="w-full lg:w-auto">
      <Link to="/crear">{t.home.createRoom}</Link>
    </Button>
  );
}
