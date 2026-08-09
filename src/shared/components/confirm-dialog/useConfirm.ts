import { useContext } from "react";
import { ConfirmContext, type ConfirmFn } from "@shared/components/confirm-dialog/context";

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return confirm;
}
