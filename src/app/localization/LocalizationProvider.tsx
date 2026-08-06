import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { LocalizationContext } from "@app/localization/localization-context";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  resolveSupportedLocale,
  type Locale,
} from "@app/localization/locale";
import { messagesByLocale } from "@app/localization/locales";

function readInitialLocale(): Locale {
  try {
    const storedLocale = resolveSupportedLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
    if (storedLocale) return storedLocale;
  } catch {
    // Fall through to the browser preference.
  }

  for (const browserLocale of navigator.languages) {
    const locale = resolveSupportedLocale(browserLocale);
    if (locale) return locale;
  }
  return DEFAULT_LOCALE;
}

export function LocalizationProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // The in-memory locale still works when storage is unavailable.
    }
  }, []);

  const value = useMemo(
    () => ({ locale, messages: messagesByLocale[locale], setLocale }),
    [locale, setLocale],
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}
