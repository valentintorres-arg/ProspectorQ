'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';
import ThemeToggle from './ThemeToggle';

const NAV_ITEMS = [
  { href: '/mapa', label: 'Mapa', icon: 'map' },
  { href: '/zonas', label: 'Zonas', icon: 'layers' },
  { href: '/pipeline', label: 'Pipeline', icon: 'view_kanban' },
  { href: '/dashboard', label: 'Dashboard', icon: 'bar_chart' },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-outline-variant/10 bg-surface-container-low p-4 shadow-[0px_4px_20px_rgba(103,75,181,0.04)] md:flex">
      <div className="mb-8 flex items-center gap-3 px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-container">
          <span className="material-symbols-outlined text-on-primary-container">radar</span>
        </div>
        <div>
          <h1 className="font-headline text-lg font-semibold tracking-tight text-primary">Prospector</h1>
          <p className="font-label text-xs text-on-surface-variant">Prospección geo B2B</p>
        </div>
      </div>

      <div className="flex flex-grow flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all active:scale-[0.98] ${
                active
                  ? 'bg-primary-container font-bold text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mb-4 mt-auto">
        <Link
          href="/mapa"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-on-primary transition-opacity hover:opacity-90"
        >
          <span className="material-symbols-outlined">add</span>
          Nueva zona
        </Link>
      </div>

      <div className="flex flex-col gap-1 border-t border-outline-variant/10 pt-4">
        <div className="flex items-center justify-between px-4 py-1">
          <span className="font-label truncate text-xs text-on-surface-variant" title={email}>
            {email}
          </span>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-4 py-2 text-left text-on-surface-variant transition-all hover:bg-surface-container-highest"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-label text-xs">Cerrar sesión</span>
        </button>
      </div>
    </nav>
  );
}
