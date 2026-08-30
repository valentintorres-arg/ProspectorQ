'use client';

import { useEffect, useState } from 'react';

interface DashboardData {
  zonasCount: number;
  negociosCount: number;
  totalLeads: number;
  porEtapa: { etapa: string; label: string; count: number }[];
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

const STAT_TILES = [
  { key: 'zonasCount', label: 'Zonas buscadas', icon: 'explore', bg: 'bg-primary-container', fg: 'text-on-primary-container' },
  { key: 'negociosCount', label: 'Negocios encontrados', icon: 'storefront', bg: 'bg-tertiary-fixed', fg: 'text-on-tertiary-fixed-variant' },
  { key: 'totalLeads', label: 'Leads en pipeline', icon: 'groups', bg: 'bg-secondary-container', fg: 'text-on-secondary-container' },
] as const;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Error cargando métricas');
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado');
      }
    }
    cargar();
  }, []);

  if (error) return <div className="p-6 text-sm text-error">{error}</div>;
  if (!data) return <div className="p-6 text-sm text-on-surface-variant">Cargando métricas…</div>;

  const maxEtapa = Math.max(...data.porEtapa.map((e) => e.count), 1);
  const maxRubro = Math.max(...data.porRubro.map((r) => r.count), 1);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-headline text-2xl font-semibold text-on-surface">Dashboard</h1>
      <p className="mb-6 text-sm text-on-surface-variant">Métricas en tiempo real de tu pipeline de prospección.</p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_TILES.map((tile) => (
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
          <p className="font-label text-xs uppercase tracking-wide text-on-surface-variant">Tasa de éxito</p>
          <p className="font-headline mt-1 text-3xl font-bold text-on-surface">
            {data.tasaGanados === null ? '—' : `${Math.round(data.tasaGanados * 100)}%`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
          <h2 className="font-title mb-4 flex items-center gap-2 text-sm font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary">filter_alt</span>
            Funnel por etapa
          </h2>
          <div className="space-y-3">
            {data.porEtapa.map((e) => (
              <BarRow key={e.etapa} label={e.label} count={e.count} max={maxEtapa} />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
          <h2 className="font-title mb-4 flex items-center gap-2 text-sm font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary">donut_small</span>
            Top rubros encontrados
          </h2>
          {data.porRubro.length === 0 && (
            <p className="text-sm text-on-surface-variant/70">Todavía no hay negocios con rubro cargado.</p>
          )}
          <div className="space-y-3">
            {data.porRubro.map((r) => (
              <BarRow key={r.rubro} label={r.rubro} count={r.count} max={maxRubro} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
