export type Locale = 'en' | 'es' | 'pt';
export const LOCALES: readonly Locale[] = ['en', 'es', 'pt'];
export const DEFAULT_LOCALE: Locale = 'en';

/** Every piece of translatable copy holds one string per locale. */
export type LocalizedText = Record<Locale, string>;

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function pick(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

/** Spanish-speaking South America, plus Spain. */
const SPANISH_COUNTRIES = new Set([
  'AR', 'BO', 'CL', 'CO', 'EC', 'PY', 'PE', 'UY', 'VE', 'ES',
]);

/** Brazil and Portugal. */
const PORTUGUESE_COUNTRIES = new Set(['BR', 'PT']);

/**
 * North America, Europe and everywhere else default to English. Mexico,
 * Central America and the Spanish-speaking Caribbean are NOT included in
 * SPANISH_COUNTRIES (the brief was literally "South America or Spain"), so
 * they currently fall back to English too — worth revisiting if that's not
 * what's wanted, since those are large Spanish-speaking audiences.
 */
export function localeForCountry(countryCode: string | null | undefined): Locale {
  const code = (countryCode || '').toUpperCase();
  if (SPANISH_COUNTRIES.has(code)) return 'es';
  if (PORTUGUESE_COUNTRIES.has(code)) return 'pt';
  return DEFAULT_LOCALE;
}
