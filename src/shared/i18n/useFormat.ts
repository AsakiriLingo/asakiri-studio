import { useCallback, useContext } from "react";
import { LocaleContext } from "@shared/i18n/context";
import { formatMessage } from "@shared/i18n/format";
import type { MessageParams } from "@shared/i18n/format";

export function useFormat(): (message: string, params?: MessageParams) => string {
  const locale = useContext(LocaleContext);
  return useCallback(
    (message: string, params?: MessageParams) => formatMessage(locale, message, params),
    [locale],
  );
}
