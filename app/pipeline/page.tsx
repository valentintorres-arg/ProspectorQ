'use client';

import { useEffect, useState } from 'react';
import { ETAPAS, type Etapa, type Lead } from '@/lib/types';

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando pipeline…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Pipeline de prospección</h1>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {ETAPAS.map((etapa) => {
          const leadsDeEtapa = leads.filter((l) => l.etapa === etapa.value);
          return (
            <div key={etapa.value} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">{etapa.label}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {leadsDeEtapa.length}
                </span>
              </div>

              <div className="space-y-2">
                {leadsDeEtapa.map((lead) => (
                  <div key={lead.id} className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
                    <p className="text-sm font-medium">{lead.negocio?.nombre}</p>
                    {lead.negocio?.rubro && (
                      <p className="text-xs text-gray-500">{lead.negocio.rubro}</p>
                    )}
                    {lead.proxima_accion && (
                      <p className="mt-1 text-xs text-blue-700">
                        Próximo: {lead.proxima_accion}
                        {lead.proxima_accion_fecha ? ` (${lead.proxima_accion_fecha})` : ''}
                      </p>
                    )}
                    <select
                      value={lead.etapa}
                      onChange={(e) => cambiarEtapa(lead.id, e.target.value as Etapa)}
                      className="mt-2 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs"
                    >
                      {ETAPAS.map((e) => (
                        <option key={e.value} value={e.value}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
