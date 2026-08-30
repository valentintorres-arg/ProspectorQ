'use client';

import { useEffect, useState } from 'react';
import Skeleton from '@/components/Skeleton';
import { traducirRubro } from '@/lib/rubros';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { Etapa } from '@/lib/types';

interface DashboardData {
  zonasCount: number;
  negociosCount: number;
  totalLeads: number;
  porEtapa: { etapa: Etapa; count: number }[];
  porRubro: { rubro: string; count: number }[];
  tasaGanados: number | null;
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.max((count / max) * 100, count > 0 ? 2 : 0) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 truncate text-on-surface-variant sm:w-40" title={label}>
        {label}
      </span>
      <div className="h-3 flex-1 rounded-full bg-surface-container-highest">
        <div className="h-3 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono w-8 shrink-0 text-right text-on-surface-variant">{count}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { lang, t } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? t.dashboard.errorLoading);
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.dashboard.unexpectedError);
      }
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <div className="p-6 text-sm text-error">{error}</div>;

  if (!data) {
    return (
      <div className="p-4 sm:p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 mb-6 h-4 w-72" />

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
              <Skeleton className="mb-3 h-10 w-10 rounded-md" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-7 w-14" />
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
              <Skeleton className="mb-4 h-4 w-40" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Skeleton className="h-3 w-24 sm:w-40" />
                    <Skeleton className="h-3 flex-1 rounded-full" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxEtapa = Math.max(...data.porEtapa.map((e) => e.count), 1);
  const maxRubro = Math.max(...data.porRubro.map((r) => r.count), 1);

  const statTiles = [
    { key: 'zonasCount' as const, label: t.dashboard.zonesSearched, icon: 'explore', bg: 'bg-primary-container', fg: 'text-on-primary-container' },
    { key: 'negociosCount' as const, label: t.dashboard.businessesFound, icon: 'storefront', bg: 'bg-tertiary-fixed', fg: 'text-on-tertiary-fixed-variant' },
    { key: 'totalLeads' as const, label: t.dashboard.leadsInPipeline, icon: 'groups', bg: 'bg-secondary-container', fg: 'text-on-secondary-container' },
  ];

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-headline text-2xl font-semibold text-on-surface">{t.dashboard.title}</h1>
      <p className="mb-6 text-sm text-on-surface-variant">{t.dashboard.subtitle}</p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statTiles.map((tile) => (
          <div key={tile.key} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-md ${tile.bg}`}>
              <span className={`material-symbols-outlined ${tile.fg}`}>{tile.icon}</span>
            </div>
            <p className="font-label text-xs uppercase tracking-wide text-on-surface-variant">{tile.label}</p>
            <p className="font-headline mt-1 text-3xl font-bold text-on-surface">{data[tile.key]}</p>
          </div>
        ))}
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary-container">
            <span className="material-symbols-outlined text-on-primary-container">trending_up</span>
          </div>
          <p className="font-label text-xs uppercase tracking-wide text-on-surface-variant">{t.dashboard.successRate}</p>
          <p className="font-headline mt-1 text-3xl font-bold text-on-surface">
            {data.tasaGanados === null ? '—' : `${Math.round(data.tasaGanados * 100)}%`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
          <h2 className="font-title mb-4 flex items-center gap-2 text-sm font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary">filter_alt</span>
            {t.dashboard.funnelByStage}
          </h2>
          <div className="space-y-3">
            {data.porEtapa.map((e) => (
              <BarRow key={e.etapa} label={t.etapas[e.etapa]} count={e.count} max={maxEtapa} />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
          <h2 className="font-title mb-4 flex items-center gap-2 text-sm font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary">donut_small</span>
            {t.dashboard.topCategories}
          </h2>
          {data.porRubro.length === 0 && (
            <p className="text-sm text-on-surface-variant/70">{t.dashboard.noCategoriesYet}</p>
          )}
          <div className="space-y-3">
            {data.porRubro.map((r) => (
              <BarRow key={r.rubro} label={traducirRubro(r.rubro, lang)} count={r.count} max={maxRubro} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
