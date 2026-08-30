'use client';

import { use, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Skeleton from '@/components/Skeleton';
import { traducirRubro } from '@/lib/rubros';
import { formatearFrescura } from '@/lib/freshness';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import {
  ETAPAS,
  TIPOS_INTERACCION,
  type Etapa,
  type Interaccion,
  type Lead,
  type TipoInteraccion,
} from '@/lib/types';

const ICONO_INTERACCION: Record<TipoInteraccion, string> = {
  nota: 'description',
  llamada: 'call',
  mail: 'mail',
  reunion: 'groups',
  whatsapp: 'chat',
};

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang, t } = useLanguage();

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
      if (!res.ok) throw new Error(data.error ?? t.leadDetail.errorLoading);
      setLead(data.lead);
      setInteracciones(data.interacciones ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.leadDetail.unexpectedError);
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
      if (!res.ok) throw new Error(t.leadDetail.errorSaving);
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
      if (!res.ok) throw new Error(data.error ?? t.leadDetail.errorAddingInteraction);
      setInteracciones((prev) => [data.interaccion, ...prev]);
      setDescripcion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.leadDetail.unexpectedError);
    } finally {
      setEnviando(false);
    }
  }

  if (error && !lead) return <div className="p-6 text-sm text-error">{error}</div>;

  if (loading || !lead) {
    return (
      <div className="w-full p-4 sm:p-6">
        <Skeleton className="mb-4 h-5 w-36" />
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48" />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            </div>
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
              <Skeleton className="mb-4 h-9 w-full rounded-md" />
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton className="h-9 rounded-md" />
                <Skeleton className="h-9 rounded-md" />
              </div>
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
              <div className="flex items-center gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-8 shrink-0 rounded-full" />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
              <Skeleton className="mb-4 h-4 w-24" />
              <Skeleton className="mb-4 h-9 w-full rounded-md" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <Skeleton className="h-14 flex-1 rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const etapaIdx = ETAPAS.findIndex((e) => e === lead.etapa);

  return (
    <div className="w-full p-4 sm:p-6">
      <Link
        href="/pipeline"
        className="font-label group mb-4 flex w-fit items-center gap-0.5 rounded-full py-1 pl-1 pr-3 text-sm text-on-surface-variant transition-colors duration-150 hover:bg-surface-container-highest hover:text-primary"
      >
        <span className="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:-translate-x-0.5">
          chevron_left
        </span>
        {t.leadDetail.backToPipeline}
      </Link>

      {error && (
        <p className="mb-4 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* Columna izquierda: identidad + acciones + campos editables */}
        <div className="space-y-4">
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h1 className="font-headline text-xl font-semibold text-on-surface">{lead.negocio?.nombre}</h1>
                {lead.negocio?.rubro && (
                  <p className="font-label mt-1 text-xs text-on-surface-variant">
                    {traducirRubro(lead.negocio.rubro, lang)}
                  </p>
                )}
              </div>
              <span className="font-label shrink-0 rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase text-on-secondary-container">
                {t.leadDetail.active}
              </span>
            </div>

            {lead.negocio?.direccion && (
              <p className="font-label flex items-center gap-1.5 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px]">location_on</span>
                {lead.negocio.direccion}
              </p>
            )}

            {(() => {
              const frescura = formatearFrescura(lead.negocio?.ultima_actualizacion ?? null, lang);
              if (!frescura) return null;
              return (
                <p
                  className={`font-label mt-1.5 flex items-center gap-1.5 text-xs ${
                    frescura.stale ? 'text-error' : 'text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {frescura.stale ? 'warning' : 'verified'}
                  </span>
                  {frescura.texto}
                </p>
              );
            })()}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={lead.negocio?.telefono ? `tel:${lead.negocio.telefono}` : undefined}
                aria-disabled={!lead.negocio?.telefono}
                className={`flex flex-col items-center gap-1 rounded-lg bg-primary-container/30 py-3 font-label text-[11px] font-medium text-on-primary-container transition-opacity ${
                  lead.negocio?.telefono ? 'hover:bg-primary-container/50' : 'pointer-events-none opacity-40'
                }`}
              >
                <span className="material-symbols-outlined">call</span>
                {t.leadDetail.call.toUpperCase()}
              </a>
              <a
                href={lead.negocio?.web ? `https://${lead.negocio.web.replace(/^https?:\/\//, '')}` : undefined}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!lead.negocio?.web}
                className={`flex flex-col items-center gap-1 rounded-lg bg-primary-container/30 py-3 font-label text-[11px] font-medium text-on-primary-container transition-opacity ${
                  lead.negocio?.web ? 'hover:bg-primary-container/50' : 'pointer-events-none opacity-40'
                }`}
              >
                <span className="material-symbols-outlined">language</span>
                {t.leadDetail.website.toUpperCase()}
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
            <label className="font-label mb-1 block text-xs uppercase tracking-wide text-on-surface-variant">
              {t.leadDetail.stage}
            </label>
            <select
              value={lead.etapa}
              onChange={(e) => actualizarLead({ etapa: e.target.value as Etapa })}
              className="mb-4 w-full rounded-md border-0 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none"
            >
              {ETAPAS.map((et) => (
                <option key={et} value={et}>
                  {t.etapas[et]}
                </option>
              ))}
            </select>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="font-label mb-1 block text-xs uppercase tracking-wide text-on-surface-variant">
                  {t.leadDetail.nextAction}
                </label>
                <input
                  type="text"
                  defaultValue={lead.proxima_accion ?? ''}
                  onBlur={(e) => actualizarLead({ proxima_accion: e.target.value || null })}
                  className="w-full rounded-md border-0 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none"
                />
              </div>
              <div>
                <label className="font-label mb-1 block text-xs uppercase tracking-wide text-on-surface-variant">
                  {t.leadDetail.date}
                </label>
                <input
                  type="date"
                  defaultValue={lead.proxima_accion_fecha ?? ''}
                  onBlur={(e) => actualizarLead({ proxima_accion_fecha: e.target.value || null })}
                  className="w-full rounded-md border-0 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none"
                />
              </div>
            </div>

            <label className="font-label mb-1 block text-xs uppercase tracking-wide text-on-surface-variant">
              {t.leadDetail.notes}
            </label>
            <textarea
              defaultValue={lead.notas ?? ''}
              onBlur={(e) => actualizarLead({ notas: e.target.value || null })}
              rows={3}
              className="w-full rounded-md border-0 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none"
            />
            {guardando && <p className="font-label mt-2 text-xs text-on-surface-variant/70">{t.leadDetail.saving}</p>}
          </div>
        </div>

        {/* Columna derecha: stepper de etapa + historial */}
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
            <div className="flex min-w-max items-center">
              {ETAPAS.map((et, i) => (
                <div key={et} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full font-label text-xs font-bold ${
                        i < etapaIdx
                          ? 'bg-primary text-on-primary'
                          : i === etapaIdx
                            ? 'bg-primary-container text-on-primary-container ring-2 ring-primary'
                            : 'bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      {i < etapaIdx ? (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`font-label whitespace-nowrap text-[10px] ${
                        i <= etapaIdx ? 'font-semibold text-on-surface' : 'text-on-surface-variant'
                      }`}
                    >
                      {t.etapas[et]}
                    </span>
                  </div>
                  {i < ETAPAS.length - 1 && (
                    <div className={`mx-1 h-0.5 w-8 ${i < etapaIdx ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
            <h2 className="font-title mb-3 text-sm font-semibold text-on-surface">{t.leadDetail.history}</h2>

            <form onSubmit={agregarInteraccion} className="mb-4 flex flex-wrap gap-2">
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoInteraccion)}
                className="rounded-md border-0 bg-surface-container-low px-2 py-1.5 text-sm text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none"
              >
                {TIPOS_INTERACCION.map((tipoOpt) => (
                  <option key={tipoOpt} value={tipoOpt}>
                    {t.interacciones[tipoOpt]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder={t.leadDetail.addNotePlaceholder}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="min-w-[140px] flex-1 rounded-md border-0 bg-surface-container-low px-3 py-1.5 text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:outline-none"
              />
              <button
                type="submit"
                disabled={enviando || !descripcion.trim()}
                className="font-label rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
              >
                {enviando ? t.leadDetail.adding : t.leadDetail.add}
              </button>
            </form>

            <div className="relative space-y-4">
              {interacciones.map((i) => (
                <div key={i.id} className="relative flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container/40 text-on-primary-container">
                      <span className="material-symbols-outlined text-[16px]">{ICONO_INTERACCION[i.tipo]}</span>
                    </div>
                    <div className="w-px flex-1 bg-outline-variant/20" />
                  </div>
                  <div className="flex-1 rounded-xl bg-surface-container-low p-3 pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-label text-xs font-semibold uppercase text-on-surface-variant">
                        {t.interacciones[i.tipo]}
                      </span>
                      <span className="font-mono text-[11px] text-on-surface-variant/70">
                        {new Date(i.created_at).toLocaleString(lang === 'en' ? 'en-US' : 'es-AR')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-on-surface">{i.descripcion}</p>
                  </div>
                </div>
              ))}
              {interacciones.length === 0 && (
                <p className="text-sm text-on-surface-variant/70">{t.leadDetail.noInteractionsYet}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
