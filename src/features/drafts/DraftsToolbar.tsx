import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import styles from "@features/drafts/DraftsPanel.module.css";

export interface DraftUploadProgress {
  readonly phase: "reading" | "converting";
  readonly fraction: number;
}

export interface DraftsToolbarProps {
  readonly editing: boolean;
  readonly onBack: () => void;
  readonly onCreate: (title: string) => Promise<string | null>;
  readonly onUpload: (
    onProgress: (progress: DraftUploadProgress) => void,
  ) => Promise<string | null>;
  readonly onOpen: (id: string) => void;
}

export function DraftsToolbar({ editing, onBack, onCreate, onUpload, onOpen }: DraftsToolbarProps) {
  const messages = useMessages();
  const t = messages.drafts;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<DraftUploadProgress | null>(null);
  const [failed, setFailed] = useState(false);

  const create = () => {
    setFailed(false);
    onCreate(t.newTitle)
      .then((id) => {
        if (id) onOpen(id);
      })
      .catch((error: unknown) => {
        console.error("Draft create failed", error);
        setFailed(true);
      });
  };

  const upload = () => {
    setUploading(true);
    setFailed(false);
    onUpload((next) => {
      setProgress(next);
    })
      .catch((error: unknown) => {
        console.error("Draft upload failed", error);
        setFailed(true);
      })
      .finally(() => {
        setUploading(false);
        setProgress(null);
      });
  };

  return (
    <>
      {editing ? (
        <IconButton size="sm" aria-label={t.back} onClick={onBack}>
          <Icon name="back" size={18} />
        </IconButton>
      ) : null}
      <Menu.Root>
        <Menu.Trigger
          render={
            <IconButton size="sm" aria-label={t.add} disabled={uploading}>
              <Icon name="plus" size={18} />
            </IconButton>
          }
        />
        <Menu.Portal>
          <Menu.Positioner className={styles.menuPositioner} sideOffset={4} align="end">
            <Menu.Popup className={styles.menuPopup}>
              <Menu.Item className={styles.menuItem} onClick={create}>
                <Icon name="plus" size={18} />
                {t.create}
              </Menu.Item>
              <Menu.Item className={styles.menuItem} onClick={upload}>
                <Icon name="file-text" size={18} />
                {t.upload}
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      {progress ? (
        <div className={styles.overlay} role="presentation">
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={t.uploading}>
            <p className={styles.dialogTitle}>{t.uploading}</p>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label={t.uploading}
              aria-valuemin={0}
              aria-valuemax={100}
              {...(progress.phase === "converting"
                ? { "aria-valuenow": Math.round(progress.fraction * 100) }
                : {})}
            >
              <div
                className={
                  progress.phase === "converting"
                    ? styles.progressFill
                    : [styles.progressFill, styles.progressIndeterminate].join(" ")
                }
                style={
                  progress.phase === "converting"
                    ? { width: `${String(Math.round(progress.fraction * 100))}%` }
                    : undefined
                }
              />
            </div>
            {progress.phase === "converting" ? (
              <p className={styles.progressText}>{String(Math.round(progress.fraction * 100))}%</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {failed ? (
        <div
          className={styles.overlay}
          role="presentation"
          onClick={() => {
            setFailed(false);
          }}
        >
          <div
            className={styles.dialog}
            role="alertdialog"
            aria-label={t.uploadFailed}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <p className={styles.dialogTitle}>{t.uploadFailed}</p>
            <div className={styles.dialogActions}>
              <Button
                size="compact"
                onClick={() => {
                  setFailed(false);
                }}
              >
                {messages.common.done}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
