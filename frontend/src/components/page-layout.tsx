import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { t } from '@/texts/es'
import { cn } from '@/lib/utils'

// Contenedor de página: una columna en móvil y tablet (máximo 760 px) y
// hasta 1040 px en ordenador, con la marca arriba como en los mockups.
export function PageLayout({
  children,
  className,
}: {
  children: ReactNode
  className?: string
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
  )
}

// Rejilla de dos columnas en ordenador (1,1fr y 1fr), una columna debajo.
export function TwoColumns({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-6',
        className,
      )}
    >
      {children}
    </div>
  )
}
