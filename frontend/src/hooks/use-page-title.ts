import { useEffect } from 'react';
import { t } from '@/texts/es';

// Título de la pestaña de cada pantalla («Crear sala · Amigo Invisible»).
// Lo anuncian los lectores de pantalla al cambiar de página.
export function usePageTitle(title?: string | null): void {
  useEffect(() => {
    document.title = title ? `${title} · ${t.appName}` : t.appName;
  }, [title]);
}
