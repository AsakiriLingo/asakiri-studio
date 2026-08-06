export const supportedLocales = ["en", "ja"] as const;

export type Locale = (typeof supportedLocales)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "asakiri.locale";

export function resolveSupportedLocale(
  value: string | null | undefined,
): Locale | null {
  if (!value) return null;
  const normalized = value.toLowerCase().split("-")[0];
  return supportedLocales.find((locale) => locale === normalized) ?? null;
}
