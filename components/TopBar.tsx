'use client';

import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import NotificationsButton from './NotificationsButton';
import AvatarMenu from './AvatarMenu';

// Mobile-only: en desktop no hay TopBar — la campanita, Upgrade y el avatar
// viven en components/Sidebar.tsx para que el contenido (el mapa sobre
// todo) use toda la altura de la pantalla sin una barra fija arriba. En
// mobile no hay sidebar (BottomNav ocupa su lugar), así que esta barra
// sigue siendo el único lugar donde mostrarlos.
export default function TopBar({ email }: { email: string }) {
  return (
    <header className="relative z-[1200] flex h-16 shrink-0 items-center justify-between border-b border-outline-variant/10 bg-surface/60 px-4 backdrop-blur-md md:hidden">
      <span className="font-headline text-lg font-semibold text-primary">Prospector</span>
      <div className="flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
        <NotificationsButton />
        <AvatarMenu email={email} />
      </div>
    </header>
  );
}
