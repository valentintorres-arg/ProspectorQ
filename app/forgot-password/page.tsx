'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import Logo from '@/components/Logo';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createBrowserSupabase();
    // Siempre mostramos el mismo mensaje de éxito, exista o no el email —
    // evita que alguien use este form para chequear qué emails están
    // registrados (Supabase ya se comporta así del lado del server).
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);
    setSent(true);
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(103,75,181,0.08)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-primary-container">
            <Logo className="h-8 w-8 text-on-primary-container" />
          </div>
          <h1 className="font-headline text-xl font-semibold text-primary">{t.forgotPassword.title}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{t.forgotPassword.description}</p>
        </div>

        {sent ? (
          <p className="rounded-lg bg-secondary-container px-3 py-2 text-center text-sm text-on-secondary-container">
            {t.forgotPassword.success}
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label
                htmlFor="email"
                className="font-label mb-1 block text-xs uppercase tracking-wide text-on-surface-variant"
              >
                {t.forgotPassword.email}
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={t.forgotPassword.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border-0 bg-surface-container-low py-2.5 pl-10 pr-3 text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? t.forgotPassword.submitting : t.forgotPassword.submit}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="font-label mt-4 block text-center text-xs text-primary hover:underline"
        >
          {t.forgotPassword.backToLogin}
        </Link>
      </div>
    </div>
  );
}
