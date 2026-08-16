export type LocaleMap = Readonly<Record<string, string>>;
export type LocalizedText = string | LocaleMap;

const LOCALE_TAG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export function isLocaleMap(value: unknown): value is LocaleMap {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  if (entries.length === 0) return false;
  return entries.every(([key, entry]) => typeof entry === "string" && LOCALE_TAG.test(key));
}

export function resolveLocalized(value: unknown, locale: string, fallback = ""): string {
  if (typeof value === "string") return value;
  if (!isLocaleMap(value)) return fallback;
  const exact = value[locale];
  if (exact !== undefined) return exact;
  const base = locale.split("-")[0] ?? locale;
  const baseMatch = value[base];
  if (baseMatch !== undefined) return baseMatch;
  return Object.values(value)[0] ?? fallback;
}

export function localesOf(value: unknown): readonly string[] {
  return isLocaleMap(value) ? Object.keys(value) : [];
}

export function withLocale(previous: unknown, locale: string, text: string): LocalizedText {
  if (!isLocaleMap(previous)) return text;
  return { ...previous, [locale]: text };
}
