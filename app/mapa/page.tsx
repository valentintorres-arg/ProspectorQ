'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Negocio } from '@/lib/types';

// Leaflet toca el DOM directamente, así que no puede renderizarse en el servidor.
const MapCanvas = dynamic(() => import('@/components/MapCanvas'), { ssr: false });

function MapaContent() {
  const searchParams = useSearchParams();
  const zonaId = searchParams.get('zonaId');

  const [resultados, setResultados] = useState<Negocio[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [enriqueciendoIds, setEnriqueciendoIds] = useState<Set<string>>(new Set());
  const [agregadosIds, setAgregadosIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [initialPolygon, setInitialPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [nombreZonaCargada, setNombreZonaCargada] = useState<string | null>(null);

  const [filtroRubro, setFiltroRubro] = useState('');
  const [soloEnriquecidos, setSoloEnriquecidos] = useState(false);

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [bulkEnriqueciendo, setBulkEnriqueciendo] = useState(false);
  const [bulkAgregando, setBulkAgregando] = useState(false);

  async function handleZoneDrawn(polygon: GeoJSON.Polygon, nombreZona?: string) {
    setBuscando(true);
    setError(null);
    try {
      const res = await fetch('/api/search-zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          polygon,
          nombreZona: nombreZona ?? `Zona ${new Date().toLocaleString('es-AR')}`,
        }),
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

  // Si venimos de /zonas con ?zonaId=..., traemos el polígono guardado, lo
  // dibujamos, y disparamos la búsqueda de una (re-búsqueda sobre la zona).
  useEffect(() => {
    if (!zonaId) return;
    let cancelado = false;

    async function cargarZona() {
      try {
        const res = await fetch(`/api/zonas/${zonaId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'No se pudo cargar la zona');
        if (cancelado) return;
        setInitialPolygon(data.polygon);
        setNombreZonaCargada(data.nombre);
        handleZoneDrawn(data.polygon, `${data.nombre} (re-búsqueda ${new Date().toLocaleDateString('es-AR')})`);
      } catch (err) {
        if (!cancelado) setError(err instanceof Error ? err.message : 'Error inesperado');
      }
    }
    cargarZona();

    return () => {
      cancelado = true;
    };
  }, [zonaId]);

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

  function toggleSeleccionado(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleEnriquecerBulk() {
    const ids = Array.from(seleccionados).filter(
      (id) => !resultados.find((n) => n.id === id)?.enriquecido
    );
    if (ids.length === 0) return;
    setBulkEnriqueciendo(true);
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negocioIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error enriqueciendo');
      const actualizados: Negocio[] = data.actualizados ?? [];
      setResultados((prev) =>
        prev.map((n) => actualizados.find((a) => a.id === n.id) ?? n)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setBulkEnriqueciendo(false);
    }
  }

  async function handleAgregarBulk() {
    const ids = Array.from(seleccionados);
    if (ids.length === 0) return;
    setBulkAgregando(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negocioIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error agregando al pipeline');
      setAgregadosIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      setSeleccionados(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setBulkAgregando(false);
    }
  }

  const rubros = useMemo(
    () => Array.from(new Set(resultados.map((n) => n.rubro).filter((r): r is string => !!r))).sort(),
    [resultados]
  );

  const resultadosFiltrados = useMemo(
    () =>
      resultados.filter((n) => {
        if (filtroRubro && n.rubro !== filtroRubro) return false;
        if (soloEnriquecidos && !n.enriquecido) return false;
        return true;
      }),
    [resultados, filtroRubro, soloEnriquecidos]
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-4 p-4 md:h-[calc(100vh-4rem)] md:flex-row">
      <div className="h-[45vh] shrink-0 md:h-auto md:flex-1">
        <MapCanvas
          onZoneDrawn={handleZoneDrawn}
          resultados={resultadosFiltrados}
          buscando={buscando}
          initialPolygon={initialPolygon}
        />
      </div>

      <aside className="min-h-[300px] flex-1 overflow-y-auto rounded-lg border border-gray-200 p-4 md:w-96 md:flex-none">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Resultados</h2>
          <Link href="/zonas" className="text-xs text-blue-600 hover:underline">
            Ver zonas guardadas
          </Link>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          {nombreZonaCargada
            ? `Volviendo a buscar sobre "${nombreZonaCargada}".`
            : 'Dibujá un polígono en el mapa (botón de dibujo arriba del mapa) para buscar negocios en esa zona.'}
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {resultados.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              value={filtroRubro}
              onChange={(e) => setFiltroRubro(e.target.value)}
              className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs"
            >
              <option value="">Todos los rubros</option>
              {rubros.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={soloEnriquecidos}
                onChange={(e) => setSoloEnriquecidos(e.target.checked)}
              />
              Solo enriquecidos
            </label>
            <span className="text-xs text-gray-400">
              {resultadosFiltrados.length} / {resultados.length}
            </span>
          </div>
        )}

        {resultadosFiltrados.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={
                  seleccionados.size > 0 &&
                  resultadosFiltrados.every((n) => seleccionados.has(n.id))
                }
                onChange={(e) =>
                  setSeleccionados(
                    e.target.checked ? new Set(resultadosFiltrados.map((n) => n.id)) : new Set()
                  )
                }
              />
              Seleccionar todos ({seleccionados.size})
            </label>
            {seleccionados.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleEnriquecerBulk}
                  disabled={bulkEnriqueciendo}
                  className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {bulkEnriqueciendo ? 'Enriqueciendo…' : 'Enriquecer selección'}
                </button>
                <button
                  onClick={handleAgregarBulk}
                  disabled={bulkAgregando}
                  className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {bulkAgregando ? 'Agregando…' : 'Agregar todos a pipeline'}
                </button>
              </div>
            )}
          </div>
        )}

        {resultados.length === 0 && !buscando && (
          <p className="text-sm text-gray-400">Todavía no hay resultados.</p>
        )}

        <ul className="space-y-3">
          {resultadosFiltrados.map((negocio) => (
            <li key={negocio.id} className="rounded-md border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(negocio.id)}
                    onChange={() => toggleSeleccionado(negocio.id)}
                    className="mt-1"
                  />
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

export default function MapaPage() {
  return (
    <Suspense>
      <MapaContent />
    </Suspense>
  );
}
