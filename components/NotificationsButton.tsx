'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useLanguage } from '@/lib/i18n/LanguageProvider';

interface NotificationItem {
  id: string;
  tipo:
    | 'lead_creado'
    | 'lead_etapa_cambiada'
    | 'lead_actualizado'
    | 'lead_eliminado'
    | 'interaccion_agregada'
    | 'miembro_sumado'
    | 'lead_vencido'
    | 'invitacion_recibida';
  detalle: Record<string, string | number | undefined>;
  leadId?: string | null;
  createdAt: string | null;
}

export default function NotificationsButton() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data, mutate } = useSWR<{ items: NotificationItem[]; unreadCount: number }>('/api/notifications', {
    refreshInterval: 60_000,
  });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && data && data.unreadCount > 0) {
      // Optimista: bajamos el badge al toque, sin esperar la respuesta.
      mutate({ ...data, unreadCount: 0 }, { revalidate: false });
      fetch('/api/notifications/read', { method: 'POST' }).catch(() => {});
    }
  }

  function mensaje(item: NotificationItem): string {
    const actor = (item.detalle.actorEmail as string) ?? '';
    const negocio = (item.detalle.negocioNombre as string) ?? '';
    switch (item.tipo) {
      case 'lead_creado':
        return item.detalle.count
          ? t.notifications.leadCreadoBulk(actor, Number(item.detalle.count))
          : t.notifications.leadCreado(actor, negocio);
      case 'lead_etapa_cambiada': {
        const de = t.etapas[item.detalle.etapaAnterior as keyof typeof t.etapas] ?? String(item.detalle.etapaAnterior ?? '');
        const a = t.etapas[item.detalle.etapaNueva as keyof typeof t.etapas] ?? String(item.detalle.etapaNueva ?? '');
        return t.notifications.leadEtapaCambiada(actor, negocio, de, a);
      }
      case 'lead_actualizado':
        return t.notifications.leadActualizado(actor, negocio);
      case 'lead_eliminado':
        return t.notifications.leadEliminado(actor, negocio);
      case 'interaccion_agregada': {
        const tipoInt = t.interacciones[item.detalle.tipoInteraccion as keyof typeof t.interacciones] ?? '';
        return t.notifications.interaccionAgregada(actor, negocio, tipoInt);
      }
      case 'miembro_sumado':
        return t.notifications.miembroSumado((item.detalle.email as string) ?? '');
      case 'lead_vencido':
        return t.notifications.leadVencido(negocio);
      case 'invitacion_recibida':
        return t.notifications.invitacionRecibida((item.detalle.orgNombre as string) ?? '');
      default:
        return '';
    }
  }

  function href(item: NotificationItem): string {
    if (item.tipo === 'invitacion_recibida') return '/organizacion';
    if (item.leadId) return `/leads/${item.leadId}`;
    return '/pipeline';
  }

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        aria-label={t.nav.notifications}
        className="relative text-on-surface-variant hover:text-primary"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 font-label text-[10px] font-bold text-on-error">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[1100] mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-[0px_8px_24px_rgba(103,75,181,0.12)]">
          <div className="border-b border-outline-variant/10 px-4 py-3">
            <p className="font-title text-sm font-semibold text-on-surface">{t.notifications.title}</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="p-4 text-sm text-on-surface-variant/70">{t.notifications.empty}</p>
            )}
            {items.map((item) => (
              <Link
                key={item.id}
                href={href(item)}
                onClick={() => setOpen(false)}
                className="block border-b border-outline-variant/10 px-4 py-3 text-sm text-on-surface last:border-0 hover:bg-surface-container-highest/60"
              >
                {mensaje(item)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
