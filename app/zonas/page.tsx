'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import Skeleton from '@/components/Skeleton';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { Zona } from '@/lib/types';

export default function ZonasPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { data, error, isLoading } = useSWR<{ zonas: Zona[] }>('/api/zonas');
  const zonas = data?.zonas ?? [];

  if (error) return <div className="p-6 text-sm text-error">{error.message || t.zonas.unexpectedError}</div>;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <Skeleton className="mt-2 mb-6 h-4 w-80" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
              <div className="mb-1 flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-3 w-36" />
              <Skeleton className="mt-4 h-8 w-40" />
              <Skeleton className="mt-4 h-9 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-headline text-2xl font-semibold text-on-surface">{t.zonas.title}</h1>
        <button
          onClick={() => router.push('/mapa')}
          className="font-label flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {t.zonas.newZone}
        </button>
      </div>
      <p className="mb-6 text-sm text-on-surface-variant">{t.zonas.subtitle}</p>

      {zonas.length === 0 && <p className="text-sm text-on-surface-variant/70">{t.zonas.noZonesYet}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {zonas.map((zona) => (
          <div
            key={zona.id}
            className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className="font-title text-base font-semibold text-on-surface">{zona.nombre}</p>
              <span className="font-label shrink-0 rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase text-on-secondary-container">
                {t.zonas.active}
              </span>
            </div>
            <p className="font-label flex items-center gap-1 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
              {new Date(zona.created_at).toLocaleString(lang === 'en' ? 'en-US' : 'es-AR')}
            </p>

            <p className="mt-4">
              <span className="font-headline text-3xl font-bold text-primary">{zona.negocios_count}</span>{' '}
              <span className="text-sm text-on-surface-variant">
                {t.zonas.businessesFoundLabel(zona.negocios_count)}
              </span>
            </p>

            <button
              onClick={() => router.push(`/mapa?zonaId=${zona.id}`)}
              className="font-label mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-xs font-medium text-on-primary-fixed-variant hover:bg-primary-fixed-dim"
            >
              <span className="material-symbols-outlined text-[16px]">my_location</span>
              {t.zonas.viewAndReSearch}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
