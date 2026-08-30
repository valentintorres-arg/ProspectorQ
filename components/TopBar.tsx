'use client';

import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';
import ThemeToggle from './ThemeToggle';

// Campanita/chat/Upgrade/avatar quedan como decoración inerte a propósito
// (no hay notificaciones, chat ni billing todavía) — así el look calza con
// el diseño de Stitch desde el día uno sin prometer funcionalidad que no existe.
export default function TopBar({ email }: { email: string }) {
  const router = useRouter();

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
        <button
          disabled
          aria-label="Notificaciones"
          className="cursor-default text-on-surface-variant/50"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button disabled aria-label="Chat" className="cursor-default text-on-surface-variant/50">
          <span className="material-symbols-outlined">chat_bubble</span>
        </button>
        <button
          disabled
          className="cursor-default rounded-full bg-tertiary-container px-4 py-1.5 text-xs font-bold text-on-tertiary-container opacity-70"
        >
          Upgrade
        </button>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/20 bg-surface-container-highest font-label text-xs font-semibold text-on-surface-variant"
          title={email}
        >
          {email.slice(0, 1).toUpperCase()}
        </div>
      </div>

      <div className="flex items-center gap-1 md:hidden">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-highest"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </header>
  );
}
