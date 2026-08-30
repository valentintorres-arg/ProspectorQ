'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import Logo from '@/components/Logo';

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t.resetPassword.tooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.resetPassword.mismatch);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(t.resetPassword.genericError);
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(103,75,181,0.08)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-primary-container">
            <Logo className="h-8 w-8 text-on-primary-container" />
          </div>
          <h1 className="font-headline text-xl font-semibold text-primary">{t.resetPassword.title}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{t.resetPassword.description}</p>
        </div>

        {success ? (
          <>
            <p className="mb-4 rounded-lg bg-secondary-container px-3 py-2 text-center text-sm text-on-secondary-container">
              {t.resetPassword.success}
            </p>
            <Link
              href="/login"
              className="font-label block text-center text-xs text-primary hover:underline"
            >
              {t.resetPassword.goToLogin}
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <p className="mb-4 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
                {error}
              </p>
            )}

            <div className="mb-4">
              <label
                htmlFor="password"
                className="font-label mb-1 block text-xs uppercase tracking-wide text-on-surface-variant"
              >
                {t.resetPassword.newPassword}
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                  lock
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border-0 bg-surface-container-low py-2.5 pl-10 pr-3 text-sm text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-6">
              <label
                htmlFor="confirmPassword"
                className="font-label mb-1 block text-xs uppercase tracking-wide text-on-surface-variant"
              >
                {t.resetPassword.confirmPassword}
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                  lock
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border-0 bg-surface-container-low py-2.5 pl-10 pr-3 text-sm text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? t.resetPassword.submitting : t.resetPassword.submit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
