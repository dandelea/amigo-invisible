import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { t } from '@/texts/es';
import { cn } from '@/lib/utils';

// Contenedor de página: una columna en móvil y tablet (máximo 760 px) y
// hasta 1040 px en ordenador, con la marca arriba como en los mockups.
export function PageLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-svh">
      <header className="mx-auto hidden w-full max-w-[1040px] px-5 pt-5 lg:block">
        <Link to="/" className="font-bold">
          {t.appName}
        </Link>
      </header>
      <main
        className={cn(
          'mx-auto flex min-h-svh w-full max-w-[760px] flex-col gap-3.5 p-5 lg:min-h-0 lg:max-w-[1040px] lg:gap-6',
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}

// Sala en dos columnas en ordenador (1,1fr y 1fr, como los mockups de
// escritorio): la lista de participantes a la izquierda y el resto a la
// derecha. En móvil es una sola columna con el orden de los mockups:
// `top` encima de la lista y `bottom` debajo. Para eso, la columna derecha
// usa `display: contents` en móvil y sus bloques se ordenan con `order`.
export function TwoColumns({
  top,
  main,
  bottom,
}: {
  top: ReactNode;
  main: ReactNode;
  bottom?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-6">
      <div className="contents lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-3.5">
        <div className="order-1 flex flex-col gap-3.5">{top}</div>
        {bottom && (
          <div className="order-3 flex flex-col gap-3.5">{bottom}</div>
        )}
      </div>
      <div className="order-2 lg:col-start-1 lg:row-start-1">{main}</div>
    </div>
  );
}
