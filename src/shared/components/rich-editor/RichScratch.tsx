import { useMemo } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { baseExtensions } from "@shared/components/rich-editor/extensions";
import { RichEditorProvider } from "@shared/components/rich-editor/context";
import {
  EMPTY_LIBRARY,
  type LoadAssetPreview,
  type RichEditorLibrary,
} from "@shared/components/rich-editor/library";
import styles from "@shared/components/rich-editor/RichEditor.module.css";

export interface RichScratchProps {
  readonly value: JSONContent;
  readonly onChange?: (document: JSONContent) => void;
  readonly ariaLabel?: string;
  readonly library?: RichEditorLibrary;
  readonly onLoadAssetPreview?: LoadAssetPreview;
}

export function RichScratch({
  value,
  onChange,
  ariaLabel,
  library,
  onLoadAssetPreview,
}: RichScratchProps) {
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
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `${styles.prose ?? ""} ${styles.scratchProse ?? ""}`.trim(),
        "aria-label": ariaLabel ?? "Draft",
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange?.(instance.getJSON());
    },
  });

  if (!editor) return <div className={styles.frame} />;

  return (
    <RichEditorProvider value={contextValue}>
      <EditorContent editor={editor} />
    </RichEditorProvider>
  );
}
