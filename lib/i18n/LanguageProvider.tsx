'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Dictionary, Lang } from './types';
import es from './es';
import en from './en';

const STORAGE_KEY = 'prospector-lang';

const dictionaries: Record<Lang, Dictionary> = { es, en };

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');

  useEffect(() => {
    // Sincroniza con lo que ya puso el script anti-flash del layout antes
    // del primer paint (no se puede leer localStorage en el render inicial).
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'es') {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- lee estado de un sistema externo (localStorage) al montar
        setLangState(stored);
      }
    } catch {
      // localStorage puede fallar en modo privado; se queda en español.
    }
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // no persiste, pero el cambio sigue funcionando para la sesión actual
    }
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: dictionaries[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage debe usarse dentro de <LanguageProvider>');
  return ctx;
}
