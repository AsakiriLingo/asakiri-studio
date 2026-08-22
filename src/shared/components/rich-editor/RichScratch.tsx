import { useEffect, useMemo } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { baseExtensions } from "@shared/components/rich-editor/extensions";
import { SearchHighlight, applySearch } from "@shared/components/rich-editor/search";
import { RichEditorProvider } from "@shared/components/rich-editor/context";
import {
  EMPTY_LIBRARY,
  type LoadAssetPreview,
  type RichEditorLibrary,
} from "@shared/components/rich-editor/library";
import styles from "@shared/components/rich-editor/RichEditor.module.css";

const scratchExtensions = [...baseExtensions, SearchHighlight];

export interface RichScratchProps {
  readonly value: JSONContent;
  readonly onChange?: (document: JSONContent) => void;
  readonly ariaLabel?: string;
  readonly searchQuery?: string;
  readonly searchActive?: number;
  readonly onSearchTotal?: (total: number) => void;
  readonly library?: RichEditorLibrary;
  readonly onLoadAssetPreview?: LoadAssetPreview;
}

export function RichScratch({
  value,
  onChange,
  ariaLabel,
  searchQuery = "",
  searchActive = 0,
  onSearchTotal,
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
    extensions: scratchExtensions,
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

  useEffect(() => {
    if (!editor) return;
    const total = applySearch(editor, searchQuery, searchActive);
    onSearchTotal?.(total);
  }, [editor, searchQuery, searchActive, onSearchTotal]);

  if (!editor) return <div className={styles.frame} />;

  return (
    <RichEditorProvider value={contextValue}>
      <EditorContent editor={editor} />
    </RichEditorProvider>
  );
}
