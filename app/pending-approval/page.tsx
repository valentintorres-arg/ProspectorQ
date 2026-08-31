'use client';

import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import Logo from '@/components/Logo';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { t } = useLanguage();

  async function handleSignOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-8 text-center shadow-[0px_4px_20px_rgba(103,75,181,0.08)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-tertiary-container">
          <span className="material-symbols-outlined text-on-tertiary-container">hourglass_top</span>
        </div>
        <div className="mb-4 flex items-center justify-center gap-2">
          <Logo className="h-5 w-5 text-primary" />
          <h1 className="font-headline text-lg font-semibold text-primary">Prospector</h1>
        </div>
        <h2 className="font-headline text-base font-semibold text-on-surface">{t.pendingApproval.title}</h2>
        <p className="mt-2 text-sm text-on-surface-variant">{t.pendingApproval.description}</p>

        <button
          onClick={handleSignOut}
          className="font-label mt-6 rounded-full bg-surface-container-highest px-4 py-2 text-xs font-medium text-on-surface-variant hover:opacity-80"
        >
          {t.pendingApproval.signOut}
        </button>
      </div>
    </div>
  );
}
