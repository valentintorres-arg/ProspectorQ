'use client';

import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
import { fetcher } from '@/lib/fetcher';

// Cachea las lecturas (zonas, leads, dashboard) en memoria del browser:
// volver a una sección no vuelve a pegarle al server si nada cambió.
// revalidateOnFocus/Reconnect (default de SWR) cubren "me cambiaron algo
// en otra pestaña/dispositivo" sin necesidad de un TTL fijo que se
// desactualice. Las mutaciones propias de cada página llaman a mutate()
// para verse reflejadas al toque, sin esperar la revalidación.
export default function SWRProvider({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ fetcher }}>{children}</SWRConfig>;
}
