'use client';

import { useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { OrgMembership } from '@/lib/types';

export default function ConfiguracionPage() {
  const { t } = useLanguage();
  const { data } = useSWR<{ orgs: OrgMembership[]; activeOrgId: string | null }>('/api/orgs');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 6) {
      setError(t.configuracion.tooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.configuracion.mismatch);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(t.configuracion.genericError);
      return;
    }
    setPassword('');
    setConfirmPassword('');
    setSuccess(true);
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-headline text-2xl font-semibold text-on-surface">{t.configuracion.title}</h1>
      <p className="mb-6 text-sm text-on-surface-variant">{t.configuracion.subtitle}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
          <h2 className="font-title mb-3 text-sm font-semibold text-on-surface">{t.configuracion.changePassword}</h2>

          {error && (
            <p className="mb-4 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>
          )}
          {success && (
            <p className="mb-4 rounded-lg bg-secondary-container px-3 py-2 text-sm text-on-secondary-container">
              {t.configuracion.success}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="font-label mb-1 block text-xs uppercase tracking-wide text-on-surface-variant">
                {t.configuracion.newPassword}
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border-0 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none"
              />
            </div>
            <div className="mb-4">
              <label className="font-label mb-1 block text-xs uppercase tracking-wide text-on-surface-variant">
                {t.configuracion.confirmPassword}
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border-0 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="font-label rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              {loading ? t.configuracion.submitting : t.configuracion.submit}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
          <h2 className="font-title mb-3 text-sm font-semibold text-on-surface">{t.configuracion.yourOrganizations}</h2>
          <div className="space-y-2">
            {(data?.orgs ?? []).map((org) => (
              <div
                key={org.orgId}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm text-on-surface">{org.orgNombre}</span>
                <span className="font-label shrink-0 rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase text-on-secondary-container">
                  {t.roles[org.role]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
