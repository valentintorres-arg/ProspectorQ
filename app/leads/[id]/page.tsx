'use client';

import { use, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  ETAPAS,
  TIPOS_INTERACCION,
  type Etapa,
  type Interaccion,
  type Lead,
  type TipoInteraccion,
} from '@/lib/types';

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [lead, setLead] = useState<Lead | null>(null);
  const [interacciones, setInteracciones] = useState<Interaccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [tipo, setTipo] = useState<TipoInteraccion>('nota');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    try {
      const res = await fetch(`/api/leads/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error cargando el lead');
      setLead(data.lead);
      setInteracciones(data.interacciones ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial de datos al montar
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function actualizarLead(update: {
    etapa?: Etapa;
    proxima_accion?: string | null;
    proxima_accion_fecha?: string | null;
    notas?: string | null;
  }) {
    if (!lead) return;
    setGuardando(true);
    setLead({ ...lead, ...update });
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etapa: update.etapa,
          proximaAccion: update.proxima_accion,
          proximaAccionFecha: update.proxima_accion_fecha,
          notas: update.notas,
        }),
      });
      if (!res.ok) throw new Error('No se pudo guardar');
    } catch {
      cargar();
    } finally {
      setGuardando(false);
    }
  }

  async function agregarInteraccion(e: FormEvent) {
    e.preventDefault();
    if (!descripcion.trim()) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/leads/${id}/interacciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, descripcion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error agregando la interacción');
      setInteracciones((prev) => [data.interaccion, ...prev]);
      setDescripcion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setEnviando(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando…</div>;
  if (error && !lead) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!lead) return null;

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <Link href="/pipeline" className="text-sm text-blue-600 hover:underline">
        ← Volver al pipeline
      </Link>

      <h1 className="mt-2 text-xl font-semibold">{lead.negocio?.nombre}</h1>
      {lead.negocio?.rubro && <p className="text-sm text-gray-500">{lead.negocio.rubro}</p>}
      {lead.negocio?.direccion && <p className="text-sm text-gray-500">{lead.negocio.direccion}</p>}
      <div className="mt-1 flex gap-3 text-sm">
        {lead.negocio?.telefono && <span>📞 {lead.negocio.telefono}</span>}
        {lead.negocio?.web && (
          <a href={lead.negocio.web} target="_blank" rel="noreferrer" className="text-blue-600 underline">
            {lead.negocio.web}
          </a>
        )}
      </div>

      {error && <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="mt-6 grid gap-4 rounded-lg border border-gray-200 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-600">Etapa</label>
          <select
            value={lead.etapa}
            onChange={(e) => actualizarLead({ etapa: e.target.value as Etapa })}
            className="mt-1 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm"
          >
            {ETAPAS.map((et) => (
              <option key={et.value} value={et.value}>
                {et.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600">Próxima acción</label>
            <input
              type="text"
              defaultValue={lead.proxima_accion ?? ''}
              onBlur={(e) => actualizarLead({ proxima_accion: e.target.value || null })}
              className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Fecha</label>
            <input
              type="date"
              defaultValue={lead.proxima_accion_fecha ?? ''}
              onBlur={(e) => actualizarLead({ proxima_accion_fecha: e.target.value || null })}
              className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600">Notas</label>
          <textarea
            defaultValue={lead.notas ?? ''}
            onBlur={(e) => actualizarLead({ notas: e.target.value || null })}
            rows={3}
            className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
          />
        </div>
        {guardando && <p className="text-xs text-gray-400">Guardando…</p>}
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Historial</h2>

        <form onSubmit={agregarInteraccion} className="mb-4 flex flex-wrap gap-2">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoInteraccion)}
            className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm"
          >
            {TIPOS_INTERACCION.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Agregar una nota…"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="min-w-[140px] flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={enviando || !descripcion.trim()}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {enviando ? 'Guardando…' : 'Agregar'}
          </button>
        </form>

        <ul className="space-y-2">
          {interacciones.map((i) => (
            <li key={i.id} className="rounded border border-gray-200 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {TIPOS_INTERACCION.find((t) => t.value === i.tipo)?.label ?? i.tipo}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(i.created_at).toLocaleString('es-AR')}
                </span>
              </div>
              <p className="mt-1">{i.descripcion}</p>
            </li>
          ))}
          {interacciones.length === 0 && <p className="text-sm text-gray-400">Sin interacciones todavía.</p>}
        </ul>
      </div>
    </div>
  );
}
