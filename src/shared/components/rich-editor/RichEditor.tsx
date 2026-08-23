import { useMemo, useState } from "react";
import { EditorContent, useEditor, useEditorState, type JSONContent } from "@tiptap/react";
import { Dialog } from "@base-ui/react/dialog";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { TextInput } from "@shared/components/form";
import { Icon } from "@shared/components/icon";
import { Tooltip, TooltipProvider } from "@shared/components/tooltip";
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

export function RichEditor({
  value,
  onChange,
  ariaLabel,
  library,
  onSaveRecordPresentation,
  onLoadAssetPreview,
  onImportMedia,
}: RichEditorProps) {
  const messages = useMessages();
  const t = messages.lesson.richEditor;
  const textColors: readonly Swatch[] = [
    { value: "#e5484d", label: t.colorRed },
    { value: "#f76b15", label: t.colorOrange },
    { value: "#ffb224", label: t.colorAmber },
    { value: "#30a46c", label: t.colorGreen },
    { value: "#0091ff", label: t.colorBlue },
    { value: "#8e4ec6", label: t.colorPurple },
  ];
  const highlightColors: readonly Swatch[] = [
    { value: "#fff3a3", label: t.colorYellow },
    { value: "#c7f0d2", label: t.colorGreen },
    { value: "#c2e7ff", label: t.colorBlue },
    { value: "#ffd1e0", label: t.colorPink },
    { value: "#e3d3ff", label: t.colorPurple },
  ];
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
        "aria-label": ariaLabel ?? t.editorLabel,
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
        <TooltipProvider>
          <div className={styles.toolbar} role="toolbar" aria-label={t.toolbar}>
            <Tooltip content={t.bold}>
              <button
                className={styles.toolButton}
                type="button"
                aria-label={t.bold}
                aria-pressed={active?.bold ?? false}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Icon name="bold" size={18} />
              </button>
            </Tooltip>
            <Tooltip content={t.italic}>
              <button
                className={styles.toolButton}
                type="button"
                aria-label={t.italic}
                aria-pressed={active?.italic ?? false}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Icon name="italic" size={18} />
              </button>
            </Tooltip>
            <Tooltip content={t.underline}>
              <button
                className={styles.toolButton}
                type="button"
                aria-label={t.underline}
                aria-pressed={active?.underline ?? false}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <Icon name="underline" size={18} />
              </button>
            </Tooltip>
            <Tooltip content={t.strikethrough}>
              <button
                className={styles.toolButton}
                type="button"
                aria-label={t.strikethrough}
                aria-pressed={active?.strike ?? false}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                <Icon name="strikethrough" size={18} />
              </button>
            </Tooltip>
            <span className={styles.divider} aria-hidden="true" />
            <ColorMenu
              icon="palette"
              menuLabel={t.textColor}
              clearLabel={t.textColorDefault}
              swatches={textColors}
              onSelect={(color) => editor.chain().focus().setColor(color).run()}
              onClear={() => editor.chain().focus().unsetColor().run()}
            />
            <ColorMenu
              icon="highlighter"
              menuLabel={t.highlightColor}
              clearLabel={t.highlightNone}
              swatches={highlightColors}
              onSelect={(color) => editor.chain().focus().setHighlight({ color }).run()}
              onClear={() => editor.chain().focus().unsetHighlight().run()}
            />
            <span className={styles.divider} aria-hidden="true" />
            <Tooltip content={t.heading}>
              <button
                className={styles.toolButton}
                type="button"
                aria-label={t.heading}
                aria-pressed={active?.heading ?? false}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              >
                <Icon name="heading" size={18} />
              </button>
            </Tooltip>
            <Tooltip content={t.bulletedList}>
              <button
                className={styles.toolButton}
                type="button"
                aria-label={t.bulletedList}
                aria-pressed={active?.bullet ?? false}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <Icon name="list" size={18} />
              </button>
            </Tooltip>
            <span className={styles.divider} aria-hidden="true" />
            <Tooltip content={t.link}>
              <button
                className={styles.toolButton}
                type="button"
                aria-label={t.link}
                aria-pressed={active?.link ?? false}
                onClick={toggleLink}
              >
                <Icon name="link" size={18} />
              </button>
            </Tooltip>
            <Tooltip content={t.insertYoutube}>
              <button
                className={styles.toolButton}
                type="button"
                aria-label={t.insertYoutube}
                onClick={insertYoutube}
              >
                <Icon name="youtube" size={18} />
              </button>
            </Tooltip>
            <Tooltip content={t.insertTable}>
              <button
                className={styles.toolButton}
                type="button"
                aria-label={t.insertTable}
                onClick={insertTable}
              >
                <Icon name="table" size={18} />
              </button>
            </Tooltip>
          </div>
        </TooltipProvider>
        {urlPrompt ? (
          <Dialog.Root
            open
            onOpenChange={(next) => {
              if (!next) cancelUrlPrompt();
            }}
          >
            <Dialog.Portal>
              <Dialog.Backdrop className={styles.urlOverlay} />
              <Dialog.Popup className={styles.urlDialog}>
                <form
                  className={styles.urlForm}
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitUrlPrompt();
                  }}
                >
                  <Dialog.Title className={styles.urlLabel}>
                    {urlPrompt.kind === "youtube" ? t.youtubeUrl : t.linkUrl}
                  </Dialog.Title>
                  <TextInput
                    type="url"
                    value={urlValue}
                    autoFocus
                    placeholder="https://…"
                    aria-label={urlPrompt.kind === "youtube" ? t.youtubeUrl : t.linkUrl}
                    onChange={(event) => {
                      setUrlValue(event.currentTarget.value);
                    }}
                  />
                  <div className={styles.urlActions}>
                    <Button variant="ghost" type="button" onClick={cancelUrlPrompt}>
                      {messages.common.cancel}
                    </Button>
                    <Button type="submit">
                      {urlPrompt.kind === "youtube" ? t.insert : t.addLink}
                    </Button>
                  </div>
                </form>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
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
