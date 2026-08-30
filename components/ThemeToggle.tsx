'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'prospector-theme';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Sincroniza con la clase que ya puso el script anti-flash en <html>
    // antes del primer paint (no se puede leer document en el render inicial).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee estado de un sistema externo (DOM) al montar
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // localStorage puede fallar en modo privado; el toggle sigue
      // funcionando para la sesión actual, solo no se persiste.
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-primary ${className}`}
    >
      <span className="material-symbols-outlined text-[20px]">
        {dark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
}
