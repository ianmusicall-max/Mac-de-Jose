'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'snapreel-theme';

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: 'light',
  toggleTheme: () => {},
});

/**
 * `explicit` is the person's own override, if any; it is persisted and
 * applied as `data-theme` on <html>, which overrides the OS preference
 * either way (app/styles/base.css reacts to that attribute). `theme`, read
 * by consumers (e.g. to pick the toggle's icon), resolves to the explicit
 * choice or else the OS's live `prefers-color-scheme`, so it always matches
 * what is actually on screen.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [explicit, setExplicit] = useState<Theme | null>(null);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExplicit(stored);
      }
    } catch { /* Storage may be disabled; the OS preference governs instead. */ }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(media.matches);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (explicit) document.documentElement.setAttribute('data-theme', explicit);
    else document.documentElement.removeAttribute('data-theme');
  }, [explicit]);

  const theme: Theme = explicit ?? (systemDark ? 'dark' : 'light');

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setExplicit(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Nothing to persist. */ }
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
