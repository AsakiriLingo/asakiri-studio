import { EditorContent, useEditor, useEditorState, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Youtube } from "@tiptap/extension-youtube";
import { TableKit } from "@tiptap/extension-table";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Icon } from "@shared/components/icon";
import { ColorMenu, type Swatch } from "@shared/components/rich-editor/ColorMenu";
import { AudioNode, ContentRecord, VideoNode } from "@shared/components/rich-editor/nodes";
import styles from "@shared/components/rich-editor/RichEditor.module.css";

export interface RichEditorProps {
  readonly value: JSONContent;
  readonly onChange?: (document: JSONContent) => void;
  readonly ariaLabel?: string;
}

const extensions = [
  StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  Image,
  Youtube.configure({ nocookie: true }),
  TableKit.configure({ table: { resizable: false } }),
  ContentRecord,
  AudioNode,
  VideoNode,
];

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

export function RichEditor({ value, onChange, ariaLabel }: RichEditorProps) {
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

  const toggleLink = () => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("Link URL");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const insertImage = () => {
    const url = window.prompt("Image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertYoutube = () => {
    const url = window.prompt("YouTube URL");
    if (url) {
      editor.commands.setYoutubeVideo({ src: url });
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const insertAudio = () => {
    editor
      .chain()
      .focus()
      .insertContent({ type: "audio", attrs: { label: "Audio clip", assetId: "asset_audio" } })
      .run();
  };

  const insertVideo = () => {
    editor
      .chain()
      .focus()
      .insertContent({ type: "video", attrs: { label: "Video clip", assetId: "asset_video" } })
      .run();
  };

  const insertContentRecord = () => {
    editor
      .chain()
      .focus()
      .insertContent({
        type: "contentRecord",
        attrs: {
          label: "Vocabulary / 猫",
          presentation: "vocabulary-card",
          binding: { kind: "record", recordId: "record_cat" },
        },
      })
      .run();
  };

  return (
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
          aria-label="Insert image"
          onClick={insertImage}
        >
          <Icon name="image" size={18} />
        </button>
        <button
          className={styles.toolButton}
          type="button"
          aria-label="Insert video"
          onClick={insertVideo}
        >
          <Icon name="video" size={18} />
        </button>
        <button
          className={styles.toolButton}
          type="button"
          aria-label="Insert audio"
          onClick={insertAudio}
        >
          <Icon name="audio" size={18} />
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
        <button
          className={styles.toolButton}
          type="button"
          aria-label="Insert content reference"
          onClick={insertContentRecord}
        >
          <Icon name="content" size={18} />
        </button>
      </div>
      <EditorContent editor={editor} />
      <footer className={styles.footer}>
        <span>Saved locally</span>
        <span>Rich content</span>
      </footer>
    </div>
  );
}
