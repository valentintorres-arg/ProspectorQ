'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Skeleton from '@/components/Skeleton';
import { traducirRubro } from '@/lib/rubros';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { Dictionary } from '@/lib/i18n/types';
import { ETAPAS, type Etapa, type Lead } from '@/lib/types';

function hoyISO() {
  // Fecha calendario LOCAL, no UTC: toISOString() se corre de día a la
  // noche en husos horarios negativos (ej. Argentina, UTC-3) y mostraba
  // "vencido" para acciones programadas para hoy mismo.
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

function estadoFecha(fecha: string | null): 'vencido' | 'hoy' | null {
  if (!fecha) return null;
  const hoy = hoyISO();
  if (fecha < hoy) return 'vencido';
  if (fecha === hoy) return 'hoy';
  return null;
}

function exportarCSV(leads: Lead[], t: Dictionary, lang: 'es' | 'en') {
  const filas = leads.map((l) => [
    l.negocio?.nombre ?? '',
    traducirRubro(l.negocio?.rubro, lang),
    l.negocio?.direccion ?? '',
    l.negocio?.telefono ?? '',
    l.negocio?.web ?? '',
    t.etapas[l.etapa],
    l.proxima_accion ?? '',
    l.proxima_accion_fecha ?? '',
    l.notas ?? '',
  ]);

  const csv = [t.pipeline.csvHeaders, ...filas]
    .map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // BOM al inicio: sin esto Excel interpreta acentos/ñ mal en Windows.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pipeline-${hoyISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PipelinePage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [dragOverEtapa, setDragOverEtapa] = useState<Etapa | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRubro, setFiltroRubro] = useState('');

  async function cargarLeads() {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.pipeline.errorLoading);
      setLeads(data.leads ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.pipeline.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial de datos al montar
    cargarLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cambiarEtapa(leadId: string, etapa: Etapa) {
    // Actualización optimista: se ve al toque, y si falla se revierte con el refetch
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, etapa } : l)));
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar');
    } catch {
      cargarLeads();
    }
  }

  function handleDrop(etapa: Etapa) {
    setDragOverEtapa(null);
    if (dragLeadId) cambiarEtapa(dragLeadId, etapa);
    setDragLeadId(null);
  }

  const rubros = useMemo(
    () => Array.from(new Set(leads.map((l) => l.negocio?.rubro).filter((r): r is string => !!r))).sort(),
    [leads]
  );

  const leadsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return leads.filter((l) => {
      if (filtroRubro && l.negocio?.rubro !== filtroRubro) return false;
      if (!q) return true;
      return (
        l.negocio?.nombre?.toLowerCase().includes(q) ||
        l.negocio?.rubro?.toLowerCase().includes(q) ||
        traducirRubro(l.negocio?.rubro, lang).toLowerCase().includes(q)
      );
    });
  }, [leads, busqueda, filtroRubro, lang]);

  if (error) return <div className="p-6 text-sm text-error">{error}</div>;

  if (loading) {
    return (
      <div className="flex h-full flex-col p-4 sm:p-6">
        <div className="mb-6 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-full rounded-full sm:w-64" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-4">
          {ETAPAS.map((etapa) => (
            <div key={etapa} className="h-full w-72 shrink-0 rounded-xl bg-surface-container-low/50 p-2">
              <div className="mb-2 flex items-center justify-between px-2 py-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-6 rounded-full" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-3">
                    <Skeleton className="mb-2 h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4 sm:p-6">
      <div className="mb-6 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="font-headline text-2xl font-semibold text-on-surface">{t.pipeline.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
              search
            </span>
            <input
              type="text"
              placeholder={t.pipeline.searchPlaceholder}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-full border-0 bg-surface-container-low py-2 pl-9 pr-3 text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:outline-none"
            />
          </div>
          <select
            value={filtroRubro}
            onChange={(e) => setFiltroRubro(e.target.value)}
            className="font-label rounded-full border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant"
          >
            <option value="">{t.pipeline.allCategories}</option>
            {rubros.map((r) => (
              <option key={r} value={r}>
                {traducirRubro(r, lang)}
              </option>
            ))}
          </select>
          <button
            onClick={() => exportarCSV(leadsFiltrados, t, lang)}
            disabled={leadsFiltrados.length === 0}
            className="font-label flex items-center gap-1.5 rounded-xl border-2 border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-primary-container/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            {t.pipeline.exportCsv}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-4">
        {ETAPAS.map((etapa) => {
          const leadsDeEtapa = leadsFiltrados.filter((l) => l.etapa === etapa);
          const isDragOver = dragOverEtapa === etapa;

          return (
            <div
              key={etapa}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverEtapa(etapa);
              }}
              onDragLeave={() => setDragOverEtapa((prev) => (prev === etapa ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(etapa);
              }}
              className={`flex h-full w-72 shrink-0 flex-col rounded-xl p-2 transition-colors ${
                isDragOver ? 'bg-primary-container/20 ring-2 ring-primary-container' : 'bg-surface-container-low/50'
              }`}
            >
              <div className="mb-2 flex shrink-0 items-center justify-between px-2 py-1">
                <h2 className="font-title text-sm font-semibold text-on-surface">{t.etapas[etapa]}</h2>
                <span className="font-mono rounded-full bg-surface-container-highest px-2 py-0.5 text-xs text-on-surface-variant">
                  {leadsDeEtapa.length}
                </span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {leadsDeEtapa.map((lead) => {
                  const estado = estadoFecha(lead.proxima_accion_fecha);
                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => setDragLeadId(lead.id)}
                      onDragEnd={() => setDragLeadId(null)}
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      className={`cursor-pointer rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-3 shadow-sm transition-all hover:border-primary/30 ${
                        dragLeadId === lead.id ? 'opacity-40' : ''
                      }`}
                    >
                      {lead.negocio?.rubro && (
                        <span className="font-label mb-1.5 inline-block rounded-full border border-outline-variant/20 bg-surface-container-highest px-2 py-0.5 text-[10px] text-on-surface-variant">
                          {traducirRubro(lead.negocio.rubro, lang)}
                        </span>
                      )}
                      <p className="font-title text-sm font-semibold text-on-surface">{lead.negocio?.nombre}</p>
                      {lead.proxima_accion && (
                        <>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {lead.proxima_accion}
                            {lead.proxima_accion_fecha ? ` · ${lead.proxima_accion_fecha}` : ''}
                          </p>
                          <p
                            className={`font-label mt-1.5 flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              estado === 'vencido'
                                ? 'bg-error-container text-on-error-container'
                                : estado === 'hoy'
                                  ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                                  : 'bg-primary-fixed text-on-primary-fixed-variant'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[12px]">
                              {estado === 'vencido' ? 'warning' : 'schedule'}
                            </span>
                            {estado === 'vencido' ? t.pipeline.overdue : estado === 'hoy' ? t.pipeline.today : t.pipeline.upcoming}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
                {leadsDeEtapa.length === 0 && (
                  <div className="rounded-xl border border-dashed border-outline-variant/30 p-3 text-center text-xs text-on-surface-variant/60">
                    {t.pipeline.dropHere}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
