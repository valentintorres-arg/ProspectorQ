'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/mapa', label: 'Mapa', icon: 'map' },
  { href: '/zonas', label: 'Zonas', icon: 'layers' },
  { href: '/pipeline', label: 'Pipeline', icon: 'view_kanban' },
  { href: '/dashboard', label: 'Stats', icon: 'bar_chart' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex h-16 shrink-0 items-center justify-around border-t border-outline-variant/10 bg-surface-container-low md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
              active ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="font-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
