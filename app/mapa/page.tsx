'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { traducirRubro } from '@/lib/rubros';
import { formatearFrescura, diasDesdeVerificacion } from '@/lib/freshness';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { Negocio } from '@/lib/types';

// Leaflet toca el DOM directamente, así que no puede renderizarse en el servidor.
const MapCanvas = dynamic(() => import('@/components/MapCanvas'), { ssr: false });

function MapaContent() {
  const searchParams = useSearchParams();
  const zonaId = searchParams.get('zonaId');
  const { lang, t } = useLanguage();

  const [resultados, setResultados] = useState<Negocio[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [enriqueciendoIds, setEnriqueciendoIds] = useState<Set<string>>(new Set());
  const [agregadosIds, setAgregadosIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [initialPolygon, setInitialPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [nombreZonaCargada, setNombreZonaCargada] = useState<string | null>(null);

  const [busquedaNombre, setBusquedaNombre] = useState('');
  const [filtroRubro, setFiltroRubro] = useState('');
  const [soloEnriquecidos, setSoloEnriquecidos] = useState(false);
  const [soloConTelefono, setSoloConTelefono] = useState(false);
  const [soloConWeb, setSoloConWeb] = useState(false);
  // '' = todos, o un número de días (7/30) — "verificado hace <= N días"
  const [filtroFrescura, setFiltroFrescura] = useState('');

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
          nombreZona: nombreZona ?? t.mapa.defaultZoneName(new Date().toLocaleString(lang === 'en' ? 'en-US' : 'es-AR')),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.mapa.errorSearching);
      setResultados(data.negocios ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.mapa.unexpectedError);
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
        if (!res.ok) throw new Error(data.error ?? t.mapa.errorLoadingZone);
        if (cancelado) return;
        setInitialPolygon(data.polygon);
        setNombreZonaCargada(data.nombre);
        handleZoneDrawn(
          data.polygon,
          t.mapa.reSearchZoneName(data.nombre, new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'es-AR'))
        );
      } catch (err) {
        if (!cancelado) setError(err instanceof Error ? err.message : t.mapa.unexpectedError);
      }
    }
    cargarZona();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (!res.ok) throw new Error(data.error ?? t.mapa.errorEnriching);
      const actualizado: Negocio | undefined = data.actualizados?.[0];
      if (actualizado) {
        setResultados((prev) => prev.map((n) => (n.id === id ? actualizado : n)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.mapa.unexpectedError);
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
      if (!res.ok && res.status !== 409) throw new Error(data.error ?? t.mapa.errorAddingToPipeline);
      setAgregadosIds((prev) => new Set(prev).add(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.mapa.unexpectedError);
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
      if (!res.ok) throw new Error(data.error ?? t.mapa.errorEnriching);
      const actualizados: Negocio[] = data.actualizados ?? [];
      setResultados((prev) =>
        prev.map((n) => actualizados.find((a) => a.id === n.id) ?? n)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t.mapa.unexpectedError);
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
      if (!res.ok) throw new Error(data.error ?? t.mapa.errorAddingToPipeline);
      setAgregadosIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      setSeleccionados(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.mapa.unexpectedError);
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
        if (busquedaNombre && !n.nombre.toLowerCase().includes(busquedaNombre.trim().toLowerCase())) return false;
        if (filtroRubro && n.rubro !== filtroRubro) return false;
        if (soloEnriquecidos && !n.enriquecido) return false;
        if (soloConTelefono && !n.telefono) return false;
        if (soloConWeb && !n.web) return false;
        if (filtroFrescura) {
          const dias = diasDesdeVerificacion(n.ultima_actualizacion);
          // Sin fecha de verificación = no podemos afirmar que esté al día,
          // así que lo sacamos del filtro (no lo dejamos pasar "por las dudas").
          if (dias === null || dias > Number(filtroFrescura)) return false;
        }
        return true;
      }),
    [resultados, busquedaNombre, filtroRubro, soloEnriquecidos, soloConTelefono, soloConWeb, filtroFrescura]
  );

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:flex-row">
      <div className="h-[45vh] shrink-0 md:h-auto md:flex-1">
        <MapCanvas
          onZoneDrawn={handleZoneDrawn}
          resultados={resultadosFiltrados}
          buscando={buscando}
          initialPolygon={initialPolygon}
        />
      </div>

      <aside className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-xl border border-outline-variant/20 bg-surface md:w-96 md:flex-none">
        <div className="border-b border-outline-variant/10 bg-surface-container-low/50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-title text-base font-semibold text-on-surface">{t.mapa.results}</h2>
            <Link href="/zonas" className="font-label text-xs text-primary hover:underline">
              {t.mapa.viewSavedZones}
            </Link>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            {nombreZonaCargada ? t.mapa.reSearching(nombreZonaCargada) : t.mapa.drawPrompt}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-lg bg-error-container p-3 text-sm text-on-error-container">{error}</div>
          )}

          {resultados.length > 0 && (
            <div className="relative mb-2">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                search
              </span>
              <input
                type="text"
                placeholder={t.mapa.searchByName}
                value={busquedaNombre}
                onChange={(e) => setBusquedaNombre(e.target.value)}
                className="w-full rounded-full border-0 bg-surface-container-low py-2 pl-9 pr-3 text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:outline-none"
              />
            </div>
          )}

          {resultados.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <select
                value={filtroRubro}
                onChange={(e) => setFiltroRubro(e.target.value)}
                className="font-label rounded-full border border-outline-variant/20 bg-surface-container-low px-3 py-1.5 text-xs text-on-surface-variant"
              >
                <option value="">{t.mapa.allCategories}</option>
                {rubros.map((r) => (
                  <option key={r} value={r}>
                    {traducirRubro(r, lang)}
                  </option>
                ))}
              </select>
              <label className="font-label flex items-center gap-1.5 text-xs text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={soloEnriquecidos}
                  onChange={(e) => setSoloEnriquecidos(e.target.checked)}
                  className="accent-primary"
                />
                {t.mapa.onlyEnriched}
              </label>
              <label className="font-label flex items-center gap-1.5 text-xs text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={soloConTelefono}
                  onChange={(e) => setSoloConTelefono(e.target.checked)}
                  className="accent-primary"
                />
                {t.mapa.onlyWithPhone}
              </label>
              <label className="font-label flex items-center gap-1.5 text-xs text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={soloConWeb}
                  onChange={(e) => setSoloConWeb(e.target.checked)}
                  className="accent-primary"
                />
                {t.mapa.onlyWithWebsite}
              </label>
              <select
                value={filtroFrescura}
                onChange={(e) => setFiltroFrescura(e.target.value)}
                title={t.mapa.freshnessFilterHint}
                className="font-label rounded-full border border-outline-variant/20 bg-surface-container-low px-3 py-1.5 text-xs text-on-surface-variant"
              >
                <option value="">{t.mapa.freshnessAny}</option>
                <option value="7">{t.mapa.freshnessWeek}</option>
                <option value="30">{t.mapa.freshnessMonth}</option>
              </select>
              <span className="font-mono text-xs text-on-surface-variant/70">
                {resultadosFiltrados.length} / {resultados.length}
              </span>
            </div>
          )}

          {resultadosFiltrados.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/10 pb-3">
              <label className="font-label flex items-center gap-1.5 text-xs text-on-surface-variant">
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
                  className="accent-primary"
                />
                {t.mapa.selectAll(seleccionados.size)}
              </label>
              {seleccionados.size > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleEnriquecerBulk}
                    disabled={bulkEnriqueciendo}
                    className="font-label rounded-full bg-surface-container-highest px-3 py-1 text-xs font-medium text-on-surface-variant hover:opacity-80 disabled:opacity-50"
                  >
                    {bulkEnriqueciendo ? t.mapa.enriching : t.mapa.enrichSelection}
                  </button>
                  <button
                    onClick={handleAgregarBulk}
                    disabled={bulkAgregando}
                    className="font-label rounded-full bg-primary px-3 py-1 text-xs font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
                  >
                    {bulkAgregando ? t.mapa.adding : t.mapa.addAllToPipeline}
                  </button>
                </div>
              )}
            </div>
          )}

          {resultados.length === 0 && !buscando && (
            <p className="text-sm text-on-surface-variant/70">{t.mapa.noResultsYet}</p>
          )}

          <ul className="space-y-3">
            {resultadosFiltrados.map((negocio) => (
              <li
                key={negocio.id}
                className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={seleccionados.has(negocio.id)}
                      onChange={() => toggleSeleccionado(negocio.id)}
                      className="mt-1 accent-primary"
                    />
                    <div>
                      <p className="font-title text-sm font-semibold text-on-surface">{negocio.nombre}</p>
                      {negocio.rubro && (
                        <p className="font-label mt-1 text-xs text-on-surface-variant">
                          {traducirRubro(negocio.rubro, lang)}
                        </p>
                      )}
                      {negocio.direccion && (
                        <p className="font-label mt-0.5 flex items-center gap-1 text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-[13px]">location_on</span>
                          {negocio.direccion}
                        </p>
                      )}
                      {negocio.telefono && (
                        <p className="font-label mt-0.5 flex items-center gap-1 text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-[13px]">call</span>
                          {negocio.telefono}
                        </p>
                      )}
                      {negocio.web && (
                        <a
                          href={negocio.web}
                          target="_blank"
                          rel="noreferrer"
                          className="font-label mt-0.5 block text-xs text-primary underline"
                        >
                          {negocio.web}
                        </a>
                      )}
                      {(() => {
                        const frescura = formatearFrescura(negocio.ultima_actualizacion, lang);
                        if (!frescura) return null;
                        return (
                          <p
                            className={`font-label mt-0.5 flex items-center gap-1 text-xs ${
                              frescura.stale ? 'text-error' : 'text-on-surface-variant'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {frescura.stale ? 'warning' : 'verified'}
                            </span>
                            {frescura.texto}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  <span
                    className={`font-mono shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      negocio.enriquecido
                        ? 'bg-primary-fixed text-on-primary-fixed-variant'
                        : 'border border-outline-variant/20 bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    {negocio.enriquecido ? t.mapa.enriched : t.mapa.basic}
                  </span>
                </div>

                <div className="mt-3 flex gap-2 border-t border-outline-variant/10 pt-3">
                  {!negocio.enriquecido && (
                    <button
                      onClick={() => handleEnriquecer(negocio.id)}
                      disabled={enriqueciendoIds.has(negocio.id)}
                      className="font-label rounded-full bg-surface-container-highest px-3 py-1 text-xs font-medium text-on-surface-variant hover:opacity-80 disabled:opacity-50"
                    >
                      {enriqueciendoIds.has(negocio.id) ? t.mapa.enriching : t.mapa.enrichWithGoogle}
                    </button>
                  )}
                  <button
                    onClick={() => handleAgregarAPipeline(negocio.id)}
                    disabled={agregadosIds.has(negocio.id)}
                    className="font-label rounded-full bg-primary px-3 py-1 text-xs font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
                  >
                    {agregadosIds.has(negocio.id) ? t.mapa.inPipeline : t.mapa.addToPipeline}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
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
