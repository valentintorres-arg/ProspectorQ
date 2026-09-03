'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { OrgMembership } from '@/lib/types';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import NotificationsButton from './NotificationsButton';
import AvatarMenu from './AvatarMenu';
import Logo from './Logo';

interface SidebarProps {
  email: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ email, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const { data: orgsData } = useSWR<{ orgs: OrgMembership[]; activeOrgId: string | null }>('/api/orgs');

  const NAV_ITEMS = [
    { href: '/mapa', label: t.nav.mapa, icon: 'map' },
    { href: '/zonas', label: t.nav.zonas, icon: 'layers' },
    { href: '/pipeline', label: t.nav.pipeline, icon: 'view_kanban' },
    { href: '/dashboard', label: t.nav.dashboard, icon: 'bar_chart' },
    { href: '/organizacion', label: t.nav.organizacion, icon: 'groups' },
  ];

  async function handleSwitchOrg(orgId: string) {
    await fetch('/api/orgs/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    });
    // Hard reload a propósito: cambiar de org invalida el cache de SWR de
    // TODA la app (leads, dashboard, zonas — ninguno incluye el org_id en
    // su key), no solo lo que renderiza el sidebar. router.refresh() no
    // alcanza a limpiar eso.
    window.location.reload();
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
          aria-label={collapsed ? t.nav.expandMenu : t.nav.collapseMenu}
          title={collapsed ? t.nav.expandMenu : undefined}
          className="flex min-w-0 items-center gap-3 rounded-lg transition-transform duration-150 hover:scale-[1.03] active:scale-95"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-container">
            <Logo className="h-6 w-6 text-on-primary-container" />
          </span>
          {!collapsed && (
            <span className="min-w-0 text-left">
              <span className="font-headline block text-lg font-semibold tracking-tight text-primary">
                Prospector
              </span>
              <span className="font-label block truncate text-xs text-on-surface-variant">{t.nav.tagline}</span>
            </span>
          )}
        </button>

        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={t.nav.collapseMenu}
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
          title={collapsed ? t.nav.newZone : undefined}
          className={`flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-on-primary shadow-sm transition-all duration-150 hover:opacity-90 hover:shadow-md active:scale-[0.98] ${
            collapsed ? 'px-0' : 'px-4'
          }`}
        >
          <span className="material-symbols-outlined">add</span>
          {!collapsed && t.nav.newZone}
        </Link>
      </div>

      <div className="flex flex-col gap-2 border-t border-outline-variant/10 pt-4">
        {/* Solo aparece si el usuario pertenece a más de una organización —
            con una sola, no hay nada que elegir y el sidebar queda igual
            que antes de que existiera multi-org. */}
        {!collapsed && orgsData && orgsData.orgs.length > 1 && (
          <label className="font-label flex flex-col gap-1 px-1 text-[10px] uppercase tracking-wide text-on-surface-variant">
            {t.organizacion.switchOrg}
            <select
              value={orgsData.activeOrgId ?? ''}
              onChange={(e) => handleSwitchOrg(e.target.value)}
              className="rounded-lg border-0 bg-surface-container-highest/50 px-2 py-1.5 text-xs font-normal normal-case text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none"
            >
              {orgsData.orgs.map((org) => (
                <option key={org.orgId} value={org.orgId}>
                  {org.orgNombre}
                </option>
              ))}
            </select>
          </label>
        )}

        {collapsed ? (
          // Colapsada no hay lugar para la tarjeta ovalada (el riel mide
          // 80px, con el padding del nav quedan 48px de contenido — justo
          // para dos switches de 44px apilados, pero no si además les suma
          // padding una tarjeta propia). Van sueltos, uno arriba del otro.
          <div className="flex flex-col items-center gap-2.5">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        ) : (
          // Expandida sí entran cómodos en una tarjeta con un switch en
          // cada punta — se leen como una barra de preferencias, no como
          // dos controles sueltos.
          <div className="flex items-center justify-between rounded-xl bg-surface-container-highest/50 p-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        )}

        {/* Notificaciones, Upgrade y cuenta: antes vivían en el TopBar de
            desktop (ver components/TopBar.tsx, ahora mobile-only) — se
            movieron acá para que el contenido, el mapa sobre todo, use toda
            la altura de la pantalla sin una barra fija arriba. Los
            dropdowns abren hacia arriba (openUpward) porque este bloque
            está pegado al fondo del sidebar; abrir hacia abajo se saldría
            de la pantalla. */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-2.5">
            <NotificationsButton openUpward />
            <Link
              href="/upgrade"
              title={t.nav.upgrade}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
            </Link>
            <AvatarMenu email={email} openUpward />
          </div>
        ) : (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <NotificationsButton openUpward />
              <Link
                href="/upgrade"
                className="font-label rounded-full bg-tertiary-container px-3 py-1 text-xs font-bold text-on-tertiary-container hover:opacity-90"
              >
                {t.nav.upgrade}
              </Link>
            </div>
            <AvatarMenu email={email} openUpward />
          </div>
        )}
      </div>
    </nav>
  );
}
