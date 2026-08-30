'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageProvider';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const NAV_ITEMS = [
    { href: '/mapa', label: t.nav.mapa, icon: 'map' },
    { href: '/zonas', label: t.nav.zonas, icon: 'layers' },
    { href: '/pipeline', label: t.nav.pipeline, icon: 'view_kanban' },
    { href: '/dashboard', label: t.nav.dashboardShort, icon: 'bar_chart' },
  ];

  return (
    <nav className="flex h-16 shrink-0 items-center justify-around border-t border-outline-variant/10 bg-surface-container-low md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 px-3 py-1.5 active:scale-95"
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150 ${
                active ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
            </span>
            <span
              className={`font-label text-[11px] transition-colors duration-150 ${
                active ? 'font-semibold text-primary' : 'text-on-surface-variant'
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
