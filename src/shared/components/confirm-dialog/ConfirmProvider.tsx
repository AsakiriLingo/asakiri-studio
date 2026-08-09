import { useCallback, useRef, useState, type ReactNode } from "react";
import { useMessages } from "@shared/i18n";
import { ConfirmDialog } from "@shared/components/confirm-dialog/ConfirmDialog";
import { ConfirmContext, type ConfirmOptions } from "@shared/components/confirm-dialog/context";

export interface ConfirmProviderProps {
  readonly children: ReactNode;
}

// Renders a single shared confirmation dialog and exposes an imperative
// `confirm(options): Promise<boolean>` through context. One dialog serves every
// destructive action in the tree, so call sites stay a single `await`.
export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const messages = useMessages();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const pending = useRef<((result: boolean) => void) | null>(null);

  const confirm = useCallback(
    (next: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        pending.current = resolve;
        setOptions(next);
      }),
    [],
  );

  const settle = useCallback((result: boolean) => {
    const resolve = pending.current;
    pending.current = null;
    setOptions(null);
    resolve?.(result);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={options !== null}
        title={options?.title ?? ""}
        description={options?.description}
        confirmLabel={options?.confirmLabel ?? messages.common.delete}
        cancelLabel={options?.cancelLabel ?? messages.common.cancel}
        tone={options?.tone ?? "danger"}
        onConfirm={() => {
          settle(true);
        }}
        onCancel={() => {
          settle(false);
        }}
      />
    </ConfirmContext.Provider>
  );
}
