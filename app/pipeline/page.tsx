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

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando pipeline…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="text-xl font-semibold">Pipeline de prospección</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por nombre o rubro…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm sm:w-64"
          />
          <button
            onClick={() => exportarCSV(leadsFiltrados)}
            disabled={leadsFiltrados.length === 0}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
          >
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
              className={`w-72 shrink-0 rounded-lg p-1 transition-colors ${
                isDragOver ? 'bg-blue-50 ring-2 ring-blue-200' : ''
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">{etapa.label}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
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
                      className={`cursor-pointer rounded-md border border-gray-200 bg-white p-3 shadow-sm hover:border-blue-300 ${
                        dragLeadId === lead.id ? 'opacity-40' : ''
                      }`}
                    >
                      <p className="text-sm font-medium">{lead.negocio?.nombre}</p>
                      {lead.negocio?.rubro && (
                        <p className="text-xs text-gray-500">{lead.negocio.rubro}</p>
                      )}
                      {lead.proxima_accion && (
                        <p
                          className={`mt-1 text-xs font-medium ${
                            estado === 'vencido'
                              ? 'text-red-600'
                              : estado === 'hoy'
                                ? 'text-amber-600'
                                : 'text-blue-700'
                          }`}
                        >
                          {estado === 'vencido' ? '⚠ Vencido: ' : estado === 'hoy' ? '● Hoy: ' : 'Próximo: '}
                          {lead.proxima_accion}
                          {lead.proxima_accion_fecha ? ` (${lead.proxima_accion_fecha})` : ''}
                        </p>
                      )}
                    </div>
                  );
                })}
                {leadsDeEtapa.length === 0 && (
                  <div className="rounded-md border border-dashed border-gray-200 p-3 text-center text-xs text-gray-400">
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
