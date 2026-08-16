import { createContext } from "react";
import { enMessages } from "@shared/i18n/en";
import { jaMessages } from "@shared/i18n/ja";
import type { Locale, StudioMessages } from "@shared/i18n/types";

const CATALOG: Record<Locale, StudioMessages> = {
  en: enMessages,
  ja: jaMessages,
};

export const LOCALES: readonly Locale[] = ["en", "ja"];

export function getMessages(locale: Locale): StudioMessages {
  return CATALOG[locale];
}

export function localeOptions(): readonly { readonly value: Locale; readonly label: string }[] {
  return LOCALES.map((locale) => ({ value: locale, label: CATALOG[locale].localeName }));
}

export const MessagesContext = createContext<StudioMessages>(enMessages);

export const LocaleContext = createContext<Locale>("en");
