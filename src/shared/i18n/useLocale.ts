import { useContext } from "react";
import { LocaleContext } from "@shared/i18n/context";
import type { Locale } from "@shared/i18n/types";

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
