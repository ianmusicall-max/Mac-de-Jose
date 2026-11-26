'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, isLocale, type Locale } from './locale';

const STORAGE_KEY = 'snapreel-locale';

const LocaleContext = createContext<{ locale: Locale; setLocale: (next: Locale) => void }>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

/**
 * English is always the default, both on the server and on first visit.
 * Only an explicit choice from the header's EN/ES/PT switcher, persisted in
 * localStorage, changes it. Page <title> and other static metadata stay
 * English-only regardless of locale: this only swaps visible content.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isLocale(stored)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocaleState(stored);
      }
    } catch { /* Storage may be disabled; English stays the default. */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(next: Locale) {
    setLocaleState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Nothing to persist. */ }
  }

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
