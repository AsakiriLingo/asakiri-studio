import { useContext } from "react";
import { LocalizationContext } from "@app/localization/localization-context";

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocalization must be used inside LocalizationProvider.");
  }
  return context;
}
