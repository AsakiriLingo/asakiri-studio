import type { ReactNode } from "react";
import { getMessages, LocaleContext, MessagesContext } from "@shared/i18n/context";
import type { Locale } from "@shared/i18n/types";

export interface I18nProviderProps {
  readonly locale: Locale;
  readonly children: ReactNode;
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  return (
    <LocaleContext.Provider value={locale}>
      <MessagesContext.Provider value={getMessages(locale)}>{children}</MessagesContext.Provider>
    </LocaleContext.Provider>
  );
}
