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

interface SidebarProps {
  email: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ email, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav
      className={`fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-outline-variant/10 bg-surface-container-low p-4 shadow-[0px_4px_20px_rgba(103,75,181,0.04)] transition-[width] duration-200 md:flex ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className={`mb-8 flex items-center gap-2 ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={collapsed ? 'Expandir menú' : undefined}
          className="flex min-w-0 items-center gap-3 rounded-lg transition-transform duration-150 hover:scale-[1.03] active:scale-95"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-container">
            <span className="material-symbols-outlined text-on-primary-container">radar</span>
          </span>
          {!collapsed && (
            <span className="min-w-0 text-left">
              <span className="font-headline block text-lg font-semibold tracking-tight text-primary">
                Prospector
              </span>
              <span className="font-label block truncate text-xs text-on-surface-variant">
                Prospección geo B2B
              </span>
            </span>
          )}
        </button>

        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Colapsar menú"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors duration-150 hover:bg-surface-container-highest hover:text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
        )}
      </div>

      <div className="flex flex-grow flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center gap-3 rounded-lg py-1.5 transition-colors duration-150 active:scale-[0.98] ${
                collapsed ? 'justify-center px-0' : 'px-2'
              } ${!active ? 'hover:bg-surface-container-highest/60' : ''}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-150 ${
                  active
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant group-hover:text-primary'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
              </span>
              {!collapsed && (
                <span className={`text-sm transition-colors duration-150 ${active ? 'font-semibold text-on-surface' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mb-4 mt-auto">
        <Link
          href="/mapa"
          title={collapsed ? 'Nueva zona' : undefined}
          className={`flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-on-primary shadow-sm transition-all duration-150 hover:opacity-90 hover:shadow-md active:scale-[0.98] ${
            collapsed ? 'px-0' : 'px-4'
          }`}
        >
          <span className="material-symbols-outlined">add</span>
          {!collapsed && 'Nueva zona'}
        </Link>
      </div>

      <div className="flex flex-col gap-1 border-t border-outline-variant/10 pt-4">
        <div className={`flex items-center px-2 py-1 ${collapsed ? 'flex-col gap-2 px-0' : 'justify-between'}`}>
          {!collapsed && (
            <span className="font-label truncate text-xs text-on-surface-variant" title={email}>
              {email}
            </span>
          )}
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={`group flex items-center gap-3 rounded-lg py-1.5 text-left transition-colors duration-150 hover:bg-surface-container-highest/60 ${
            collapsed ? 'justify-center px-0' : 'px-2'
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors duration-150 group-hover:text-error">
            <span className="material-symbols-outlined">logout</span>
          </span>
          {!collapsed && (
            <span className="font-label text-xs text-on-surface-variant transition-colors duration-150 group-hover:text-error">
              Cerrar sesión
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}
