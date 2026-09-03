'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import NotificationsButton from './NotificationsButton';
import AvatarMenu from './AvatarMenu';

export default function TopBar({ email }: { email: string }) {
  const { t } = useLanguage();

  return (
    // relative + z-[1200]: backdrop-blur (filter) crea su propio stacking
    // context, así que ningún z-index adentro (el dropdown de notificaciones
    // o el del avatar) puede escaparlo para pintarse arriba del mapa — el
    // mapa (components/MapCanvas.tsx) tiene overlays con z-[1000]. Hay que
    // posicionar el header ENTERO por encima de eso, no solo sus hijos.
    <header className="relative z-[1200] flex h-16 shrink-0 items-center justify-between border-b border-outline-variant/10 bg-surface/60 px-4 backdrop-blur-md md:px-6">
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

      {/* Mobile: mismos controles reales que el desktop (antes solo tenía
          logout directo — campanita, Upgrade y Configuración quedaban
          inalcanzables desde el celular). El logout ahora vive adentro del
          dropdown del avatar, así que no hace falta un botón aparte. */}
      <div className="flex items-center gap-1 md:hidden">
        <LanguageToggle />
        <ThemeToggle />
        <NotificationsButton />
        <AvatarMenu email={email} />
      </div>
    </header>
  );
}
