'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import Logo from '@/components/Logo';

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="flex h-full flex-col items-center justify-center overflow-y-auto p-4 sm:p-6">
      <div className="w-full max-w-4xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-primary-container">
            <Logo className="h-8 w-8 text-on-primary-container" />
          </div>
          <h1 className="font-headline text-3xl font-semibold text-on-surface">{t.home.title}</h1>
          <p className="mt-2 max-w-lg text-sm text-on-surface-variant">{t.home.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.steps.map((step) => (
            <div
              key={step.title}
              className="flex flex-col items-start gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container">
                <span className="material-symbols-outlined text-on-primary-container">{step.icon}</span>
              </span>
              <h2 className="font-headline text-sm font-semibold text-on-surface">{step.title}</h2>
              <p className="text-xs text-on-surface-variant">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/mapa"
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            {t.home.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
