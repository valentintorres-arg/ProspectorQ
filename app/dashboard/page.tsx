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
      <span className="w-24 shrink-0 truncate text-gray-600 sm:w-40" title={label}>
        {label}
      </span>
      <div className="h-4 flex-1 rounded bg-gray-100">
        <div className="h-4 rounded bg-blue-600" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-gray-500">{count}</span>
    </div>
  );
}

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

  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!data) return <div className="p-6 text-sm text-gray-500">Cargando métricas…</div>;

  const maxEtapa = Math.max(...data.porEtapa.map((e) => e.count), 1);
  const maxRubro = Math.max(...data.porRubro.map((r) => r.count), 1);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-semibold">Dashboard</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Zonas buscadas</p>
          <p className="text-2xl font-semibold">{data.zonasCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Negocios encontrados</p>
          <p className="text-2xl font-semibold">{data.negociosCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Leads en pipeline</p>
          <p className="text-2xl font-semibold">{data.totalLeads}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Tasa de éxito (cerrados)</p>
          <p className="text-2xl font-semibold">
            {data.tasaGanados === null ? '—' : `${Math.round(data.tasaGanados * 100)}%`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Funnel por etapa</h2>
          <div className="space-y-2">
            {data.porEtapa.map((e) => (
              <BarRow key={e.etapa} label={e.label} count={e.count} max={maxEtapa} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Top rubros encontrados</h2>
          {data.porRubro.length === 0 && (
            <p className="text-sm text-gray-400">Todavía no hay negocios con rubro cargado.</p>
          )}
          <div className="space-y-2">
            {data.porRubro.map((r) => (
              <BarRow key={r.rubro} label={r.rubro} count={r.count} max={maxRubro} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
