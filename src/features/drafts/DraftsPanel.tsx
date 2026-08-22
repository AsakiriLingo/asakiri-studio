import { useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { ContextMenu } from "@base-ui/react/context-menu";
import type { TiptapDocument, TiptapNode } from "@core/course";
import type { Draft } from "@core/drafts";
import { useFormat, useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import {
  RichScratch,
  type LoadAssetPreview,
  type RichEditorLibrary,
} from "@shared/components/rich-editor";
import styles from "@features/drafts/DraftsPanel.module.css";

const SAVE_DEBOUNCE_MS = 700;

function draftExcerpt(document: TiptapDocument, max = 200): string {
  const parts: string[] = [];
  let length = 0;
  const walk = (node: TiptapNode) => {
    if (length >= max) return;
    if (typeof node.text === "string") {
      parts.push(node.text);
      length += node.text.length;
    }
    for (const child of node.content ?? []) {
      if (length >= max) break;
      walk(child);
    }
  };
  for (const block of (document.content ?? []).slice(1)) {
    if (length >= max) break;
    walk(block);
  }
  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export interface DraftUploadProgress {
  readonly phase: "reading" | "converting";
  readonly fraction: number;
}

export interface DraftsPanelProps {
  readonly drafts: readonly Draft[];
  readonly onUpload: (
    onProgress: (progress: DraftUploadProgress) => void,
  ) => Promise<string | null>;
  readonly onUpdate: (id: string, document: TiptapDocument) => Promise<boolean>;
  readonly onDelete: (id: string) => Promise<boolean>;
  readonly library?: RichEditorLibrary;
  readonly onLoadAssetPreview?: LoadAssetPreview;
}

export function DraftsPanel({
  drafts,
  onUpload,
  onUpdate,
  onDelete,
  library,
  onLoadAssetPreview,
}: DraftsPanelProps) {
  const messages = useMessages();
  const t = messages.drafts;
  const format = useFormat();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<DraftUploadProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ id: string; document: JSONContent } | null>(null);

  const selected = drafts.find((draft) => draft.id === selectedId) ?? null;

  const flush = () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const next = pending.current;
    if (next) {
      pending.current = null;
      void onUpdate(next.id, next.document as unknown as TiptapDocument);
    }
  };

  const queueSave = (id: string, document: JSONContent) => {
    pending.current = { id, document };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
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

  if (selected) {
    return (
      <div className={styles.panel}>
        <div className={styles.editorHeader}>
          <IconButton
            size="sm"
            aria-label={t.back}
            onClick={() => {
              flush();
              setSelectedId(null);
            }}
          >
            <Icon name="back" size={18} />
          </IconButton>
          <span className={styles.editorTitle}>{selected.title}</span>
        </div>
        <div className={styles.editorBody}>
          <RichScratch
            key={selected.id}
            value={selected.document as unknown as JSONContent}
            ariaLabel={t.editorAria}
            onChange={(document) => {
              queueSave(selected.id, document);
            }}
            {...(library ? { library } : {})}
            {...(onLoadAssetPreview ? { onLoadAssetPreview } : {})}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.listHeader}>
        <Button size="compact" disabled={uploading} onClick={upload}>
          <Icon name="file-text" size={16} />
          {uploading ? t.uploading : t.upload}
        </Button>
      </div>
      {failed ? <p className={styles.error}>{t.uploadFailed}</p> : null}
      {drafts.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{t.empty}</p>
          <p className={styles.emptyBody}>{t.emptyBody}</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {drafts.map((draft) => {
            const excerpt = draftExcerpt(draft.document);
            return (
              <li key={draft.id}>
                <ContextMenu.Root>
                  <ContextMenu.Trigger
                    render={
                      <button
                        type="button"
                        className={styles.card}
                        aria-label={format(t.openAria, { title: draft.title })}
                        onClick={() => {
                          setSelectedId(draft.id);
                        }}
                      >
                        <span className={styles.cardHeader}>
                          <Icon name="file-text" size={16} className={styles.cardIcon} />
                          <span className={styles.cardTitle}>{draft.title}</span>
                        </span>
                        {excerpt ? <span className={styles.cardExcerpt}>{excerpt}</span> : null}
                      </button>
                    }
                  />
                  <ContextMenu.Portal>
                    <ContextMenu.Positioner className={styles.menuPositioner}>
                      <ContextMenu.Popup className={styles.menuPopup}>
                        <ContextMenu.Item
                          className={[styles.menuItem, styles.menuItemDanger].join(" ")}
                          onClick={() => {
                            void onDelete(draft.id);
                          }}
                        >
                          {messages.common.delete}
                        </ContextMenu.Item>
                      </ContextMenu.Popup>
                    </ContextMenu.Positioner>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              </li>
            );
          })}
        </ul>
      )}
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
    </div>
  );
}
