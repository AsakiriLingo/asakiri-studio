import { useContext } from "react";
import { MessagesContext } from "@shared/i18n/context";
import type { StudioMessages } from "@shared/i18n/types";

export function useMessages(): StudioMessages {
  return useContext(MessagesContext);
}
