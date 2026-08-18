import { createContext } from "react";
import enMessages from "@shared/i18n/en.json";
import esMessages from "@shared/i18n/es.json";
import itMessages from "@shared/i18n/it.json";
import ptMessages from "@shared/i18n/pt.json";
import ruMessages from "@shared/i18n/ru.json";
import jaMessages from "@shared/i18n/ja.json";
import type { Locale, StudioMessages } from "@shared/i18n/types";

const CATALOG: Record<Locale, StudioMessages> = {
  en: enMessages,
  es: esMessages,
  it: itMessages,
  pt: ptMessages,
  ru: ruMessages,
  ja: jaMessages,
};

export const LOCALES: readonly Locale[] = ["en", "es", "it", "pt", "ru", "ja"];

export function getMessages(locale: Locale): StudioMessages {
  return CATALOG[locale];
}

export function localeOptions(): readonly { readonly value: Locale; readonly label: string }[] {
  return LOCALES.map((locale) => ({ value: locale, label: CATALOG[locale].localeName }));
}

export const MessagesContext = createContext<StudioMessages>(enMessages);

export const LocaleContext = createContext<Locale>("en");
