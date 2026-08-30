'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import Logo from '@/components/Logo';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setError(t.login.invalidCredentials);
      return;
    }

    router.push(searchParams.get('next') || '/mapa');
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(103,75,181,0.08)]"
    >
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-primary-container">
          <Logo className="h-8 w-8 text-on-primary-container" />
        </div>
        <h1 className="font-headline text-2xl font-semibold text-primary">Prospector</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t.login.tagline}</p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>
      )}

      <div className="mb-4">
        <label htmlFor="email" className="font-label mb-1 block text-xs uppercase tracking-wide text-on-surface-variant">
          {t.login.email}
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
            placeholder={t.login.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border-0 bg-surface-container-low py-2.5 pl-10 pr-3 text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-6">
        <label
          htmlFor="password"
          className="font-label mb-1 block text-xs uppercase tracking-wide text-on-surface-variant"
        >
          {t.login.password}
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
            lock
          </span>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border-0 bg-surface-container-low py-2.5 pl-10 pr-10 text-sm text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[18px]">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? t.login.submitting : t.login.submit}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
