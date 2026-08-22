import { useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { ContextMenu } from "@base-ui/react/context-menu";
import type { TiptapDocument, TiptapNode } from "@core/course";
import type { Draft } from "@core/drafts";
import { useFormat, useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import {
  RichScratch,
  type LoadAssetPreview,
  type RichEditorLibrary,
} from "@shared/components/rich-editor";
import styles from "@features/drafts/DraftsPanel.module.css";

const SAVE_DEBOUNCE_MS = 700;

function RenameInput({
  defaultValue,
  ariaLabel,
  onCommit,
  onCancel,
}: {
  readonly defaultValue: string;
  readonly ariaLabel: string;
  readonly onCommit: (value: string) => void;
  readonly onCancel: () => void;
}) {
  return (
    <input
      className={styles.renameInput}
      defaultValue={defaultValue}
      aria-label={ariaLabel}
      autoComplete="off"
      autoFocus
      onFocus={(event) => {
        event.currentTarget.select();
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit(event.currentTarget.value);
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      onBlur={(event) => {
        onCommit(event.currentTarget.value);
      }}
    />
  );
}

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

export interface DraftsPanelProps {
  readonly drafts: readonly Draft[];
  readonly query?: string;
  readonly searchActive?: number;
  readonly onSearchTotal?: (total: number) => void;
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly onUpdate: (id: string, document: TiptapDocument) => Promise<boolean>;
  readonly onRename: (id: string, title: string) => Promise<boolean>;
  readonly onDelete: (id: string) => Promise<boolean>;
  readonly library?: RichEditorLibrary;
  readonly onLoadAssetPreview?: LoadAssetPreview;
}

export function DraftsPanel({
  drafts,
  query = "",
  searchActive = 0,
  onSearchTotal,
  selectedId,
  onSelect,
  onUpdate,
  onRename,
  onDelete,
  library,
  onLoadAssetPreview,
}: DraftsPanelProps) {
  const messages = useMessages();
  const t = messages.drafts;
  const format = useFormat();
  const [renamingId, setRenamingId] = useState<string | null>(null);
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

  if (selected) {
    return (
      <div className={styles.panel}>
        <div className={styles.editorBody}>
          <RichScratch
            key={selected.id}
            value={selected.document as unknown as JSONContent}
            ariaLabel={t.editorAria}
            searchQuery={query}
            searchActive={searchActive}
            onChange={(document) => {
              queueSave(selected.id, document);
            }}
            {...(onSearchTotal ? { onSearchTotal } : {})}
            {...(library ? { library } : {})}
            {...(onLoadAssetPreview ? { onLoadAssetPreview } : {})}
          />
        </div>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{t.empty}</p>
          <p className={styles.emptyBody}>{t.emptyBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <ul className={styles.list}>
        {drafts.map((draft) => {
          const excerpt = draftExcerpt(draft.document);
          return (
            <li key={draft.id}>
              {renamingId === draft.id ? (
                <div className={styles.card}>
                  <span className={styles.cardHeader}>
                    <Icon name="file-text" size={16} className={styles.cardIcon} />
                    <RenameInput
                      defaultValue={draft.title}
                      ariaLabel={messages.common.rename}
                      onCommit={(value) => {
                        setRenamingId(null);
                        const next = value.trim();
                        if (next && next !== draft.title) void onRename(draft.id, next);
                      }}
                      onCancel={() => {
                        setRenamingId(null);
                      }}
                    />
                  </span>
                </div>
              ) : (
                <ContextMenu.Root>
                  <ContextMenu.Trigger
                    render={
                      <button
                        type="button"
                        className={styles.card}
                        aria-label={format(t.openAria, { title: draft.title })}
                        onClick={() => {
                          onSelect(draft.id);
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
                          className={styles.menuItem}
                          onClick={() => {
                            setRenamingId(draft.id);
                          }}
                        >
                          {messages.common.rename}
                        </ContextMenu.Item>
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
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
