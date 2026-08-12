import { createContext } from "react";
import { enMessages } from "@shared/i18n/en";
import { jaMessages } from "@shared/i18n/ja";
import type { Locale, StudioMessages } from "@shared/i18n/types";

const CATALOG: Record<Locale, StudioMessages> = {
  en: enMessages,
  ja: jaMessages,
};

export function getMessages(locale: Locale): StudioMessages {
  return CATALOG[locale];
}

export const MessagesContext = createContext<StudioMessages>(enMessages);

export const LocaleContext = createContext<Locale>("en");
