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

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando zonas…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Zonas buscadas</h1>
        <button
          onClick={() => router.push('/mapa')}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nueva zona
        </button>
      </div>

      {zonas.length === 0 && (
        <p className="text-sm text-gray-400">Todavía no dibujaste ninguna zona en el mapa.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {zonas.map((zona) => (
          <div key={zona.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="font-medium">{zona.nombre}</p>
            <p className="mt-1 text-xs text-gray-500">
              {new Date(zona.created_at).toLocaleString('es-AR')}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              {zona.negocios_count} {zona.negocios_count === 1 ? 'negocio encontrado' : 'negocios encontrados'}
            </p>
            <button
              onClick={() => router.push(`/mapa?zonaId=${zona.id}`)}
              className="mt-3 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200"
            >
              Ver y volver a buscar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
