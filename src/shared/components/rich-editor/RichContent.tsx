import { useEffect, useMemo } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { baseExtensions } from "@shared/components/rich-editor/extensions";
import { RichEditorProvider } from "@shared/components/rich-editor/context";
import {
  EMPTY_LIBRARY,
  type LoadAssetPreview,
  type RichEditorLibrary,
} from "@shared/components/rich-editor/library";
import styles from "@shared/components/rich-editor/RichEditor.module.css";

export interface RichContentProps {
  readonly value: JSONContent;
  readonly ariaLabel?: string;
  readonly library?: RichEditorLibrary;
  readonly onLoadAssetPreview?: LoadAssetPreview;
}

export function RichContent({ value, ariaLabel, library, onLoadAssetPreview }: RichContentProps) {
  const lib = library ?? EMPTY_LIBRARY;
  const contextValue = useMemo(
    () => ({
      library: lib,
      loadAssetPreview: onLoadAssetPreview ?? (() => Promise.resolve(null)),
    }),
    [lib, onLoadAssetPreview],
  );

  const editor = useEditor({
    extensions: baseExtensions,
    content: value,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `${styles.prose ?? ""} ${styles.previewProse ?? ""}`.trim(),
        "aria-label": ariaLabel ?? "Lesson preview",
      },
    },
  });

  useEffect(() => {
    if (editor) editor.commands.setContent(value);
  }, [editor, value]);

  if (!editor) return <div className={styles.frame} />;

  return (
    <RichEditorProvider value={contextValue}>
      <EditorContent editor={editor} />
    </RichEditorProvider>
  );
}
