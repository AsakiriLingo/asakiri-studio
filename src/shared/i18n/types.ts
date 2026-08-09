import type { enMessages } from "@shared/i18n/en";

export type Locale = "en" | "ja";

/**
 * The English catalog is the source of truth for the message shape. Other
 * locales are checked against it with `satisfies StudioMessages`.
 */
export type StudioMessages = typeof enMessages;
