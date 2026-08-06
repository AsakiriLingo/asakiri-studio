import { createContext } from "react";
import type { AppMessages } from "@app/localization/messages";
import type { Locale } from "@app/localization/locale";

export interface LocalizationContextValue {
  readonly locale: Locale;
  readonly messages: AppMessages;
  setLocale(locale: Locale): void;
}

export const LocalizationContext =
  createContext<LocalizationContextValue | null>(null);
