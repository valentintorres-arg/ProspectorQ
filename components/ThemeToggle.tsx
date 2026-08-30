'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageProvider';

const STORAGE_KEY = 'prospector-theme';

// Interruptor día/noche: de día el track recorre los 3 pasteles de marca
// (lavanda -> celeste -> durazno, un mini "amanecer"), de noche es un cielo
// estrellado con estrellitas en esos mismos 3 tonos. El sol/luna se
// escala+rota al cruzar en vez de aparecer de golpe.
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
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
      aria-label={dark ? t.theme.toLight : t.theme.toDark}
      aria-pressed={dark}
      className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-[background] duration-500 ease-out ${
        dark
          ? 'bg-gradient-to-br from-[#12162c] via-[#1b1f42] to-[#2a1f4d]'
          : 'bg-gradient-to-r from-[#cebdff] via-[#dce9ff] to-[#ffdcbd]'
      } ${className}`}
    >
      {/* estrellas: solo visibles/tituleantes en modo oscuro, una por cada pastel de marca */}
      <span className={`absolute inset-0 transition-opacity duration-500 ${dark ? 'opacity-100' : 'opacity-0'}`}>
        <span
          className="absolute left-[7px] top-[5px] h-[3px] w-[3px] rounded-full bg-[#cebdff]"
          style={{ animation: 'twinkle 2.2s ease-in-out infinite' }}
        />
        <span
          className="absolute left-[13px] top-[15px] h-[2px] w-[2px] rounded-full bg-[#45dfa4]"
          style={{ animation: 'twinkle 1.8s ease-in-out infinite 0.5s' }}
        />
        <span
          className="absolute left-[20px] top-[8px] h-[2px] w-[2px] rounded-full bg-[#fcb973]"
          style={{ animation: 'twinkle 2.6s ease-in-out infinite 1s' }}
        />
      </span>

      {/* nubecitas: solo visibles en modo claro */}
      <span className={`absolute inset-0 transition-opacity duration-500 ${dark ? 'opacity-0' : 'opacity-80'}`}>
        <span className="absolute right-[6px] top-[4px] h-[5px] w-[9px] rounded-full bg-white/70 blur-[0.5px]" />
        <span className="absolute right-[3px] top-[13px] h-[4px] w-[6px] rounded-full bg-white/60 blur-[0.5px]" />
      </span>

      {/* thumb: sol <-> luna */}
      <span
        className={`absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          dark
            ? 'left-[calc(100%-1.375rem)] bg-gradient-to-br from-slate-100 to-indigo-200 shadow-[0_0_8px_rgba(206,189,255,0.7)]'
            : 'left-[2px] bg-gradient-to-br from-amber-200 to-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
        }`}
      >
        <span
          className={`material-symbols-outlined absolute text-[14px] text-amber-700 transition-all duration-500 ${
            dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          light_mode
        </span>
        <span
          className={`material-symbols-outlined absolute text-[14px] text-indigo-900 transition-all duration-500 ${
            dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          }`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          dark_mode
        </span>
      </span>
    </button>
  );
}
