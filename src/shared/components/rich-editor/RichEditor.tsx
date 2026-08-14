import { useMemo, useState } from "react";
import { EditorContent, useEditor, useEditorState, type JSONContent } from "@tiptap/react";
import { Icon } from "@shared/components/icon";
import { ColorMenu, type Swatch } from "@shared/components/rich-editor/ColorMenu";
import { baseExtensions } from "@shared/components/rich-editor/extensions";
import { RichEditorProvider } from "@shared/components/rich-editor/context";
import {
  EMPTY_LIBRARY,
  type EditorAsset,
  type EditorPresentation,
  type EditorRecord,
  type ImportMedia,
  type LoadAssetPreview,
  type RichEditorLibrary,
  type SaveRecordPresentation,
} from "@shared/components/rich-editor/library";
import { SlashCommand, type SlashState } from "@shared/components/rich-editor/slash-command";
import { SlashMenu } from "@shared/components/rich-editor/SlashMenu";
import styles from "@shared/components/rich-editor/RichEditor.module.css";

export interface RichEditorProps {
  readonly value: JSONContent;
  readonly onChange?: (document: JSONContent) => void;
  readonly ariaLabel?: string;
  readonly library?: RichEditorLibrary;
  readonly onSaveRecordPresentation?: SaveRecordPresentation;
  readonly onLoadAssetPreview?: LoadAssetPreview;
  readonly onImportMedia?: ImportMedia;
}

const TEXT_COLORS: readonly Swatch[] = [
  { value: "#e5484d", label: "Red" },
  { value: "#f76b15", label: "Orange" },
  { value: "#ffb224", label: "Amber" },
  { value: "#30a46c", label: "Green" },
  { value: "#0091ff", label: "Blue" },
  { value: "#8e4ec6", label: "Purple" },
];

const HIGHLIGHT_COLORS: readonly Swatch[] = [
  { value: "#fff3a3", label: "Yellow" },
  { value: "#c7f0d2", label: "Green" },
  { value: "#c2e7ff", label: "Blue" },
  { value: "#ffd1e0", label: "Pink" },
  { value: "#e3d3ff", label: "Purple" },
];

export function RichEditor({
  value,
  onChange,
  ariaLabel,
  library,
  onSaveRecordPresentation,
  onLoadAssetPreview,
  onImportMedia,
}: RichEditorProps) {
  const lib = library ?? EMPTY_LIBRARY;
  const contextValue = useMemo(
    () => ({
      library: lib,
      loadAssetPreview: onLoadAssetPreview ?? (() => Promise.resolve(null)),
    }),
    [lib, onLoadAssetPreview],
  );
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [urlPrompt, setUrlPrompt] = useState<{ readonly kind: "link" | "youtube" } | null>(null);
  const [urlValue, setUrlValue] = useState("");

  const [slashExtension] = useState(() =>
    SlashCommand.configure({
      onStateChange: (next: SlashState | null) => {
        setSlash(next);
      },
    }),
  );
  const extensions = useMemo(() => [...baseExtensions, slashExtension], [slashExtension]);

  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: styles.prose ?? "",
        "aria-label": ariaLabel ?? "Rich content",
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange?.(instance.getJSON());
    },
  });

  const active = useEditorState({
    editor,
    selector: ({ editor: instance }) =>
      instance
        ? {
            bold: instance.isActive("bold"),
            italic: instance.isActive("italic"),
            underline: instance.isActive("underline"),
            strike: instance.isActive("strike"),
            heading: instance.isActive("heading", { level: 2 }),
            bullet: instance.isActive("bulletList"),
            link: instance.isActive("link"),
          }
        : null,
  });

  if (!editor) {
    return <div className={styles.frame} />;
  }

  const closeSlash = () => {
    if (slash) editor.chain().focus().deleteRange(slash.range).run();
    setSlash(null);
  };

  const runInsert = (content: Record<string, unknown>) => {
    if (!slash) return;
    editor.chain().focus().deleteRange(slash.range).insertContent(content).run();
  };

  const insertAsset = (asset: EditorAsset) => {
    if (asset.kind === "audio") {
      runInsert({ type: "audio", attrs: { assetId: asset.id, label: asset.label } });
    } else if (asset.kind === "video") {
      runInsert({ type: "video", attrs: { assetId: asset.id, label: asset.label } });
    } else {
      runInsert({
        type: "image",
        attrs: { src: asset.file ?? "", assetId: asset.id, alt: asset.label },
      });
    }
  };

  const insertRecord = (record: EditorRecord, presentation: EditorPresentation) => {
    runInsert({
      type: "contentRecord",
      attrs: {
        label: record.label,
        presentation: presentation.id,
        binding: { kind: "record", recordId: record.id },
      },
    });
    void onSaveRecordPresentation?.(record.id, presentation);
  };

  const importMedia = async () => {
    if (!onImportMedia) return;
    const asset = await onImportMedia();
    if (asset) insertAsset(asset);
  };

  const openUrlPrompt = (kind: "link" | "youtube") => {
    const href: unknown = editor.getAttributes("link").href;
    setUrlValue(kind === "link" && typeof href === "string" ? href : "");
    setUrlPrompt({ kind });
  };

  const cancelUrlPrompt = () => {
    setUrlPrompt(null);
    setUrlValue("");
  };

  const submitUrlPrompt = () => {
    const url = urlValue.trim();
    if (url) {
      if (urlPrompt?.kind === "youtube") {
        editor.commands.setYoutubeVideo({ src: url });
      } else {
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      }
    }
    cancelUrlPrompt();
  };

  const toggleLink = () => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    openUrlPrompt("link");
  };

  const insertYoutube = () => {
    openUrlPrompt("youtube");
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <RichEditorProvider value={contextValue}>
      <div className={styles.frame}>
        <div className={styles.toolbar} role="toolbar" aria-label="Rich content formatting">
          <button
            className={styles.toolButton}
            type="button"
            aria-label="Bold"
            aria-pressed={active?.bold ?? false}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Icon name="bold" size={18} />
          </button>
          <button
            className={styles.toolButton}
            type="button"
            aria-label="Italic"
            aria-pressed={active?.italic ?? false}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Icon name="italic" size={18} />
          </button>
          <button
            className={styles.toolButton}
            type="button"
            aria-label="Underline"
            aria-pressed={active?.underline ?? false}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <Icon name="underline" size={18} />
          </button>
          <button
            className={styles.toolButton}
            type="button"
            aria-label="Strikethrough"
            aria-pressed={active?.strike ?? false}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Icon name="strikethrough" size={18} />
          </button>
          <span className={styles.divider} aria-hidden="true" />
          <ColorMenu
            icon="palette"
            menuLabel="Text color"
            clearLabel="Default"
            swatches={TEXT_COLORS}
            onSelect={(color) => editor.chain().focus().setColor(color).run()}
            onClear={() => editor.chain().focus().unsetColor().run()}
          />
          <ColorMenu
            icon="highlighter"
            menuLabel="Highlight color"
            clearLabel="None"
            swatches={HIGHLIGHT_COLORS}
            onSelect={(color) => editor.chain().focus().setHighlight({ color }).run()}
            onClear={() => editor.chain().focus().unsetHighlight().run()}
          />
          <span className={styles.divider} aria-hidden="true" />
          <button
            className={styles.toolButton}
            type="button"
            aria-label="Heading"
            aria-pressed={active?.heading ?? false}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Icon name="heading" size={18} />
          </button>
          <button
            className={styles.toolButton}
            type="button"
            aria-label="Bulleted list"
            aria-pressed={active?.bullet ?? false}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <Icon name="list" size={18} />
          </button>
          <span className={styles.divider} aria-hidden="true" />
          <button
            className={styles.toolButton}
            type="button"
            aria-label="Link"
            aria-pressed={active?.link ?? false}
            onClick={toggleLink}
          >
            <Icon name="link" size={18} />
          </button>
          <button
            className={styles.toolButton}
            type="button"
            aria-label="Insert YouTube video"
            onClick={insertYoutube}
          >
            <Icon name="youtube" size={18} />
          </button>
          <button
            className={styles.toolButton}
            type="button"
            aria-label="Insert table"
            onClick={insertTable}
          >
            <Icon name="table" size={18} />
          </button>
        </div>
        {urlPrompt ? (
          <div className={styles.urlOverlay} role="presentation" onClick={cancelUrlPrompt}>
            <div
              className={styles.urlDialog}
              role="dialog"
              aria-modal="true"
              aria-label={urlPrompt.kind === "youtube" ? "Insert YouTube video" : "Add link"}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <span className={styles.urlLabel}>
                {urlPrompt.kind === "youtube" ? "YouTube URL" : "Link URL"}
              </span>
              <input
                className={styles.urlInput}
                type="url"
                value={urlValue}
                autoFocus
                placeholder="https://…"
                aria-label={urlPrompt.kind === "youtube" ? "YouTube URL" : "Link URL"}
                onChange={(event) => {
                  setUrlValue(event.currentTarget.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitUrlPrompt();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    cancelUrlPrompt();
                  }
                }}
              />
              <div className={styles.urlActions}>
                <button className={styles.urlCancel} type="button" onClick={cancelUrlPrompt}>
                  Cancel
                </button>
                <button className={styles.urlAdd} type="button" onClick={submitUrlPrompt}>
                  {urlPrompt.kind === "youtube" ? "Insert" : "Add link"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <EditorContent editor={editor} />
        {slash ? (
          <SlashMenu
            state={slash}
            library={lib}
            onClose={closeSlash}
            onInsertAsset={insertAsset}
            onInsertRecord={insertRecord}
            onImportMedia={onImportMedia ? importMedia : undefined}
          />
        ) : null}
      </div>
    </RichEditorProvider>
  );
}
