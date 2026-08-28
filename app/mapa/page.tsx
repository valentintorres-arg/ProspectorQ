'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Negocio } from '@/lib/types';

// Leaflet toca el DOM directamente, así que no puede renderizarse en el servidor.
const MapCanvas = dynamic(() => import('@/components/MapCanvas'), { ssr: false });

export default function MapaPage() {
  const [resultados, setResultados] = useState<Negocio[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [enriqueciendoIds, setEnriqueciendoIds] = useState<Set<string>>(new Set());
  const [agregadosIds, setAgregadosIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleZoneDrawn(polygon: GeoJSON.Polygon) {
    setBuscando(true);
    setError(null);
    try {
      const res = await fetch('/api/search-zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ polygon, nombreZona: `Zona ${new Date().toLocaleString('es-AR')}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error buscando la zona');
      setResultados(data.negocios ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setBuscando(false);
    }
  }

  async function handleEnriquecer(id: string) {
    setEnriqueciendoIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negocioIds: [id] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error enriqueciendo');
      const actualizado: Negocio | undefined = data.actualizados?.[0];
      if (actualizado) {
        setResultados((prev) => prev.map((n) => (n.id === id ? actualizado : n)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setEnriqueciendoIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleAgregarAPipeline(id: string) {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negocioId: id }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) throw new Error(data.error ?? 'Error agregando al pipeline');
      setAgregadosIds((prev) => new Set(prev).add(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      <div className="flex-1">
        <MapCanvas onZoneDrawn={handleZoneDrawn} resultados={resultados} buscando={buscando} />
      </div>

      <aside className="w-96 shrink-0 overflow-y-auto rounded-lg border border-gray-200 p-4">
        <h2 className="mb-1 text-lg font-semibold">Resultados</h2>
        <p className="mb-4 text-sm text-gray-500">
          Dibujá un polígono en el mapa (botón de dibujo arriba del mapa) para buscar negocios en esa zona.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {resultados.length === 0 && !buscando && (
          <p className="text-sm text-gray-400">Todavía no hay resultados.</p>
        )}

        <ul className="space-y-3">
          {resultados.map((negocio) => (
            <li key={negocio.id} className="rounded-md border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{negocio.nombre}</p>
                  {negocio.rubro && <p className="text-xs text-gray-500">{negocio.rubro}</p>}
                  {negocio.direccion && <p className="text-xs text-gray-500">{negocio.direccion}</p>}
                  {negocio.telefono && <p className="text-xs text-gray-700">📞 {negocio.telefono}</p>}
                  {negocio.web && (
                    <a
                      href={negocio.web}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 underline"
                    >
                      {negocio.web}
                    </a>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    negocio.enriquecido ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {negocio.enriquecido ? 'enriquecido' : 'básico (OSM)'}
                </span>
              </div>

              <div className="mt-2 flex gap-2">
                {!negocio.enriquecido && (
                  <button
                    onClick={() => handleEnriquecer(negocio.id)}
                    disabled={enriqueciendoIds.has(negocio.id)}
                    className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                  >
                    {enriqueciendoIds.has(negocio.id) ? 'Enriqueciendo…' : 'Enriquecer con Google'}
                  </button>
                )}
                <button
                  onClick={() => handleAgregarAPipeline(negocio.id)}
                  disabled={agregadosIds.has(negocio.id)}
                  className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {agregadosIds.has(negocio.id) ? 'En pipeline ✓' : 'Agregar a pipeline'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
