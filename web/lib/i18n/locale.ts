export type Locale = 'en' | 'es' | 'pt';
export const LOCALES: readonly Locale[] = ['en', 'es', 'pt'];
export const DEFAULT_LOCALE: Locale = 'en';

/** Every piece of translatable copy holds one string per locale. */
export type LocalizedText = Record<Locale, string>;

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** es/pt are auto-detected from the browser; anything else falls back to English. */
export function detectLocale(language: string | undefined | null): Locale {
  const lower = (language || '').toLowerCase();
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('pt')) return 'pt';
  return DEFAULT_LOCALE;
}

export function pick(text: LocalizedText, locale: Locale): string {
  return text[locale];
}
