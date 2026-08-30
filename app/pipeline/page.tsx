'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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

function exportarCSV(leads: Lead[]) {
  const headers = [
    'Nombre',
    'Rubro',
    'Dirección',
    'Teléfono',
    'Web',
    'Etapa',
    'Próxima acción',
    'Fecha',
    'Notas',
  ];
  const filas = leads.map((l) => [
    l.negocio?.nombre ?? '',
    l.negocio?.rubro ?? '',
    l.negocio?.direccion ?? '',
    l.negocio?.telefono ?? '',
    l.negocio?.web ?? '',
    ETAPAS.find((e) => e.value === l.etapa)?.label ?? l.etapa,
    l.proxima_accion ?? '',
    l.proxima_accion_fecha ?? '',
    l.notas ?? '',
  ]);

  const csv = [headers, ...filas]
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [dragOverEtapa, setDragOverEtapa] = useState<Etapa | null>(null);
  const [busqueda, setBusqueda] = useState('');

  async function cargarLeads() {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error cargando leads');
      setLeads(data.leads ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial de datos al montar
    cargarLeads();
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

  const leadsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.negocio?.nombre?.toLowerCase().includes(q) || l.negocio?.rubro?.toLowerCase().includes(q)
    );
  }, [leads, busqueda]);

  if (loading) return <div className="p-6 text-sm text-on-surface-variant">Cargando pipeline…</div>;
  if (error) return <div className="p-6 text-sm text-error">{error}</div>;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="font-headline text-2xl font-semibold text-on-surface">Pipeline</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre o rubro…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-full border-0 bg-surface-container-low py-2 pl-9 pr-3 text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:outline-none"
            />
          </div>
          <button
            onClick={() => exportarCSV(leadsFiltrados)}
            disabled={leadsFiltrados.length === 0}
            className="font-label flex items-center gap-1.5 rounded-xl border-2 border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-primary-container/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {ETAPAS.map((etapa) => {
          const leadsDeEtapa = leadsFiltrados.filter((l) => l.etapa === etapa.value);
          const isDragOver = dragOverEtapa === etapa.value;

          return (
            <div
              key={etapa.value}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverEtapa(etapa.value);
              }}
              onDragLeave={() => setDragOverEtapa((prev) => (prev === etapa.value ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(etapa.value);
              }}
              className={`w-72 shrink-0 rounded-xl p-2 transition-colors ${
                isDragOver ? 'bg-primary-container/20 ring-2 ring-primary-container' : 'bg-surface-container-low/50'
              }`}
            >
              <div className="mb-2 flex items-center justify-between px-2 py-1">
                <h2 className="font-title text-sm font-semibold text-on-surface">{etapa.label}</h2>
                <span className="font-mono rounded-full bg-surface-container-highest px-2 py-0.5 text-xs text-on-surface-variant">
                  {leadsDeEtapa.length}
                </span>
              </div>

              <div className="space-y-2">
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
                          {lead.negocio.rubro}
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
                            {estado === 'vencido' ? 'Vencido' : estado === 'hoy' ? 'Hoy' : 'Próximo'}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
                {leadsDeEtapa.length === 0 && (
                  <div className="rounded-xl border border-dashed border-outline-variant/30 p-3 text-center text-xs text-on-surface-variant/60">
                    Soltá una tarjeta acá
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
