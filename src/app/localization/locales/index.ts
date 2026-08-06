import type { Locale } from "@app/localization/locale";
import type { AppMessages } from "@app/localization/messages";
import { enMessages } from "@app/localization/locales/en";
import { jaMessages } from "@app/localization/locales/ja";

export const messagesByLocale = {
  en: enMessages,
  ja: jaMessages,
} satisfies Record<Locale, AppMessages>;
