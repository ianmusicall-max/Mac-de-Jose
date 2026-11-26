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

/** Spanish-speaking South America, Spain, Mexico and the Spanish-speaking Caribbean. */
const SPANISH_COUNTRIES = new Set([
  'AR', 'BO', 'CL', 'CO', 'EC', 'PY', 'PE', 'UY', 'VE', 'ES',
  'MX', 'CU', 'DO', 'PR',
]);

/** Brazil and Portugal. */
const PORTUGUESE_COUNTRIES = new Set(['BR', 'PT']);

/** The rest of North America, Europe and everywhere else default to English. */
export function localeForCountry(countryCode: string | null | undefined): Locale {
  const code = (countryCode || '').toUpperCase();
  if (SPANISH_COUNTRIES.has(code)) return 'es';
  if (PORTUGUESE_COUNTRIES.has(code)) return 'pt';
  return DEFAULT_LOCALE;
}
