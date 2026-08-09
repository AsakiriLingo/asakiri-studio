import { createContext } from "react";
import type { ConfirmTone } from "@shared/components/confirm-dialog/ConfirmDialog";

export interface ConfirmOptions {
  readonly title: string;
  readonly description?: string | undefined;
  readonly confirmLabel?: string | undefined;
  readonly cancelLabel?: string | undefined;
  readonly tone?: ConfirmTone | undefined;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);
