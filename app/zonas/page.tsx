'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Zona } from '@/lib/types';

export default function ZonasPage() {
  const router = useRouter();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch('/api/zonas');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Error cargando zonas');
        setZonas(data.zonas ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado');
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  if (loading) return <div className="p-6 text-sm text-on-surface-variant">Cargando zonas…</div>;
  if (error) return <div className="p-6 text-sm text-error">{error}</div>;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-headline text-2xl font-semibold text-on-surface">Zonas guardadas</h1>
        <button
          onClick={() => router.push('/mapa')}
          className="font-label flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva zona
        </button>
      </div>
      <p className="mb-6 text-sm text-on-surface-variant">
        Administrá y volvé a escanear tus áreas de prospección guardadas.
      </p>

      {zonas.length === 0 && (
        <p className="text-sm text-on-surface-variant/70">Todavía no dibujaste ninguna zona en el mapa.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {zonas.map((zona) => (
          <div
            key={zona.id}
            className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className="font-title text-base font-semibold text-on-surface">{zona.nombre}</p>
              <span className="font-label shrink-0 rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase text-on-secondary-container">
                Activa
              </span>
            </div>
            <p className="font-label flex items-center gap-1 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
              {new Date(zona.created_at).toLocaleString('es-AR')}
            </p>

            <p className="mt-4">
              <span className="font-headline text-3xl font-bold text-primary">{zona.negocios_count}</span>{' '}
              <span className="text-sm text-on-surface-variant">
                {zona.negocios_count === 1 ? 'negocio encontrado' : 'negocios encontrados'}
              </span>
            </p>

            <button
              onClick={() => router.push(`/mapa?zonaId=${zona.id}`)}
              className="font-label mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-xs font-medium text-on-primary-fixed-variant hover:bg-primary-fixed-dim"
            >
              <span className="material-symbols-outlined text-[16px]">my_location</span>
              Ver y volver a buscar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
