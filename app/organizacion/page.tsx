'use client';

import { useState, type FormEvent } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import Skeleton from '@/components/Skeleton';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { Invitation, MembershipRole, OrgMember } from '@/lib/types';

interface OrgActive {
  id: string;
  nombre: string;
  myRole: MembershipRole;
  members: OrgMember[];
  sentInvitations: { id: string; email: string; created_at: string }[];
}

const ASIGNABLE_ROLES: MembershipRole[] = ['admin', 'member'];

export default function OrganizacionPage() {
  const { t } = useLanguage();
  const {
    data: org,
    error: orgError,
    isLoading: orgLoading,
    mutate: mutateOrg,
  } = useSWR<OrgActive>('/api/orgs/active');
  const { data: receivedData, mutate: mutateReceived } = useSWR<{ invitations: Invitation[] }>(
    '/api/orgs/invitations'
  );
  const received = receivedData?.invitations ?? [];

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  const canManage = org?.myRole === 'owner' || org?.myRole === 'admin';
  const isOwner = org?.myRole === 'owner';

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setActionError(null);
    try {
      const res = await fetch('/api/orgs/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.organizacion.unexpectedError);
      setInviteEmail('');
      await mutateOrg();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.organizacion.unexpectedError);
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(id: string) {
    setActionError(null);
    try {
      const res = await fetch(`/api/orgs/invitations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t.organizacion.unexpectedError);
      }
      await mutateOrg();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.organizacion.unexpectedError);
    }
  }

  async function handleRemoveMember(userId: string) {
    setActionError(null);
    try {
      const res = await fetch(`/api/orgs/members/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t.organizacion.unexpectedError);
      }
      await mutateOrg();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.organizacion.unexpectedError);
    }
  }

  async function handleChangeRole(userId: string, role: MembershipRole) {
    setActionError(null);
    try {
      const res = await fetch(`/api/orgs/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t.organizacion.unexpectedError);
      }
      await mutateOrg();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.organizacion.unexpectedError);
    }
  }

  async function handleAccept(id: string) {
    setActionError(null);
    try {
      const res = await fetch(`/api/orgs/invitations/${id}/accept`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t.organizacion.unexpectedError);
      }
      // La org activa cambia a la que acabás de aceptar (ver la API route):
      // recargar es lo más simple para que todo el resto de la app (sidebar,
      // pipeline, dashboard) refleje eso sin arrastrar cache viejo.
      window.location.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.organizacion.unexpectedError);
    }
  }

  async function handleDecline(id: string) {
    setDecliningId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/orgs/invitations/${id}/decline`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t.organizacion.unexpectedError);
      }
      await mutateReceived();
      await globalMutate('/api/orgs');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.organizacion.unexpectedError);
    } finally {
      setDecliningId(null);
    }
  }

  if (orgError) {
    return <div className="p-6 text-sm text-error">{orgError.message || t.organizacion.errorLoading}</div>;
  }

  if (orgLoading || !org) {
    return (
      <div className="p-4 sm:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 mb-6 h-4 w-80" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-headline text-2xl font-semibold text-on-surface">{org.nombre}</h1>
      <p className="mb-6 text-sm text-on-surface-variant">
        {t.organizacion.yourRole}: <span className="font-semibold">{t.roles[org.myRole]}</span>
      </p>

      {actionError && (
        <p className="mb-4 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{actionError}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Miembros */}
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
          <h2 className="font-title mb-3 text-sm font-semibold text-on-surface">{t.organizacion.members}</h2>
          <div className="space-y-2">
            {org.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2">
                <span className="min-w-0 truncate text-sm text-on-surface" title={m.email}>
                  {m.email}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {isOwner && m.role !== 'owner' ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleChangeRole(m.id, e.target.value as MembershipRole)}
                      className="rounded-md border-0 bg-surface-container-highest px-2 py-1 text-xs text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none"
                    >
                      {ASIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t.roles[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-label rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase text-on-secondary-container">
                      {t.roles[m.role]}
                    </span>
                  )}
                  {m.role !== 'owner' && canManage && (m.role !== 'admin' || isOwner) && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      title={t.organizacion.remove}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container/50 hover:text-on-error-container"
                    >
                      <span className="material-symbols-outlined text-[16px]">person_remove</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invitar + invitaciones enviadas */}
        {canManage && (
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
            <h2 className="font-title mb-3 text-sm font-semibold text-on-surface">{t.organizacion.inviteTitle}</h2>
            <form onSubmit={handleInvite} className="mb-4 flex gap-2">
              <input
                type="email"
                required
                placeholder={t.organizacion.inviteEmailPlaceholder}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="min-w-0 flex-1 rounded-md border-0 bg-surface-container-low px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:outline-none"
              />
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="font-label shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
              >
                {inviting ? t.organizacion.inviting : t.organizacion.invite}
              </button>
            </form>

            <h3 className="font-label mb-2 text-xs uppercase tracking-wide text-on-surface-variant">
              {t.organizacion.pendingInvitations}
            </h3>
            {org.sentInvitations.length === 0 && (
              <p className="text-sm text-on-surface-variant/70">{t.organizacion.noPendingInvitations}</p>
            )}
            <div className="space-y-2">
              {org.sentInvitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2">
                  <span className="min-w-0 truncate text-sm text-on-surface" title={inv.email}>
                    {inv.email}
                  </span>
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="font-label shrink-0 rounded-md px-2 py-1 text-xs font-medium text-error hover:bg-error-container/50"
                  >
                    {t.organizacion.revoke}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invitaciones que te llegaron a vos */}
      <div className="mt-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
        <h2 className="font-title mb-3 text-sm font-semibold text-on-surface">{t.organizacion.receivedInvitations}</h2>
        {received.length === 0 && (
          <p className="text-sm text-on-surface-variant/70">{t.organizacion.noReceivedInvitations}</p>
        )}
        <div className="space-y-2">
          {received.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2">
              <span className="min-w-0 truncate text-sm text-on-surface">{t.organizacion.invitedTo(inv.orgNombre)}</span>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => handleAccept(inv.id)}
                  className="font-label rounded-md bg-primary px-2 py-1 text-xs font-medium text-on-primary hover:opacity-90"
                >
                  {t.organizacion.accept}
                </button>
                <button
                  onClick={() => handleDecline(inv.id)}
                  disabled={decliningId === inv.id}
                  className="font-label rounded-md px-2 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-50"
                >
                  {decliningId === inv.id ? t.organizacion.declining : t.organizacion.decline}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
