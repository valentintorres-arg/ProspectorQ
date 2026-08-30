'use client';

import { useLanguage } from '@/lib/i18n/LanguageProvider';

// Mismas medidas que ThemeToggle (w-11 h-6) para que queden parejos uno al
// lado del otro. Lavanda (ES) <-> menta (EN): los dos pasteles restantes de
// la marca, así el par de switches usa los 3 acentos completos entre ambos.
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useLanguage();
  const isEn = lang === 'en';

  return (
    <button
      onClick={() => setLang(isEn ? 'es' : 'en')}
      aria-label={isEn ? t.language.toSpanish : t.language.toEnglish}
      aria-pressed={isEn}
      className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors duration-500 ease-out ${
        isEn
          ? 'bg-gradient-to-r from-secondary-container to-secondary/40'
          : 'bg-gradient-to-r from-primary-container to-primary/40'
      } ${className}`}
    >
      <span
        className={`absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-surface-container-lowest text-[9px] font-bold text-on-surface shadow-[0_1px_4px_rgba(0,0,0,0.25)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isEn ? 'left-[calc(100%-1.375rem)]' : 'left-[2px]'
        }`}
      >
        <span
          className={`absolute font-label transition-all duration-500 ${
            isEn ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
          }`}
        >
          ES
        </span>
        <span
          className={`absolute font-label transition-all duration-500 ${
            isEn ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
          }`}
        >
          EN
        </span>
      </span>
    </button>
  );
}
