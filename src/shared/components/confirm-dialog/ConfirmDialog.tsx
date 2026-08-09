import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "@shared/components/button";
import styles from "@shared/components/confirm-dialog/ConfirmDialog.module.css";

export type ConfirmTone = "danger" | "default";

export interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string | undefined;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly tone?: ConfirmTone;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

// Presentational, fully controlled. Prefer the `useConfirm` hook for call sites;
// this stays exported for callers that manage their own open state.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        // Escape, backdrop click, or any programmatic close counts as cancel.
        if (!next) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={styles.backdrop} />
        <AlertDialog.Popup className={styles.popup}>
          <AlertDialog.Title className={styles.title}>{title}</AlertDialog.Title>
          {description ? (
            <AlertDialog.Description className={styles.description}>
              {description}
            </AlertDialog.Description>
          ) : null}
          <div className={styles.actions}>
            <Button variant="ghost" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
