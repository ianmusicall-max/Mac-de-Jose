'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, detectLocale, isLocale, type Locale } from './locale';

const STORAGE_KEY = 'snapreel-locale';

const LocaleContext = createContext<{ locale: Locale; setLocale: (next: Locale) => void }>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

/**
 * English is the base rendered on the server. On mount, a stored explicit
 * choice wins; otherwise the browser's language picks es/pt automatically
 * without persisting it, so a future visit (or a cleared profile) keeps
 * re-detecting instead of getting stuck on a guess. Page <title> and other
 * static metadata stay English-only regardless of locale: this only swaps
 * visible content.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isLocale(stored)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocaleState(stored);
        return;
      }
    } catch { /* Storage may be disabled; detect from the browser instead. */ }
    setLocaleState(detectLocale(navigator.language));
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
