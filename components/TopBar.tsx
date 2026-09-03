'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import NotificationsButton from './NotificationsButton';
import AvatarMenu from './AvatarMenu';

export default function TopBar({ email }: { email: string }) {
  const router = useRouter();
  const { t } = useLanguage();

  async function handleLogout() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant/10 bg-surface/60 px-4 backdrop-blur-md md:px-6">
      <span className="font-headline text-lg font-semibold text-primary md:hidden">Prospector</span>
      <div className="hidden flex-1 md:block" />

      <div className="hidden items-center gap-4 md:flex">
        <NotificationsButton />
        <Link
          href="/upgrade"
          className="rounded-full bg-tertiary-container px-4 py-1.5 text-xs font-bold text-on-tertiary-container hover:opacity-90"
        >
          {t.nav.upgrade}
        </Link>
        <AvatarMenu email={email} />
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <LanguageToggle />
        <ThemeToggle />
        <button
          onClick={handleLogout}
          aria-label={t.nav.logout}
          className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-highest"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </header>
  );
}
