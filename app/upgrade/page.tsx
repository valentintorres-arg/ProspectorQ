'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageProvider';

export default function UpgradePage() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-8 text-center shadow-[0px_4px_20px_rgba(103,75,181,0.08)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-tertiary-container">
          <span className="material-symbols-outlined text-on-tertiary-container">rocket_launch</span>
        </div>
        <h1 className="font-headline text-lg font-semibold text-on-surface">{t.upgrade.title}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{t.upgrade.description}</p>

        <Link
          href="/mapa"
          className="font-label mt-6 inline-block rounded-full bg-primary px-4 py-2 text-xs font-medium text-on-primary hover:opacity-90"
        >
          {t.upgrade.backToApp}
        </Link>
      </div>
    </div>
  );
}
