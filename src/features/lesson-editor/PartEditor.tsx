import { useEffect, useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import type {
  Asset,
  ContentRecord,
  Course,
  Exercise,
  Part,
  PartContent,
  TiptapDocument,
} from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import { useFormat, useMessages } from "@shared/i18n";
import {
  RichEditor,
  RichEditorProvider,
  type EditorAsset,
  type EditorPresentation,
  type ImportMedia,
  type LoadAssetPreview,
  type RichEditorLibrary,
  type SaveRecordPresentation,
} from "@shared/components/rich-editor";
import { partKind } from "@core/course";
import { FillBlankEditor } from "@features/lesson-editor/exercise/FillBlankEditor";
import { ListeningEditor } from "@features/lesson-editor/exercise/ListeningEditor";
import { MatchPairsEditor } from "@features/lesson-editor/exercise/MatchPairsEditor";
import { MultipleChoiceEditor } from "@features/lesson-editor/exercise/MultipleChoiceEditor";
import { SpeakingEditor } from "@features/lesson-editor/exercise/SpeakingEditor";
import { WordOrderEditor } from "@features/lesson-editor/exercise/WordOrderEditor";
import { courseToRichLibrary } from "@features/lesson-editor/rich-library";
import styles from "@features/lesson-editor/LessonEditor.module.css";

const RICH_TEXT_SEED: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Your first Japanese words" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Japanese uses three writing systems. You do not need to learn them all at once. Start by meeting words in context.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "A familiar word" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Meet " },
        {
          type: "contentRecord",
          attrs: {
            label: "Vocabulary / 猫",
            presentation: "vocabulary-card",
            binding: { kind: "record", recordId: "record_cat" },
          },
        },
        { type: "text", text: ". The same content record can provide its image and both" },
        { type: "text", text: " audio versions anywhere this lesson needs them." },
      ],
    },
  ],
};

function RichTextEditor({
  initial,
  onPersist,
  library,
  onSaveRecordPresentation,
  onLoadAssetPreview,
  onImportMedia,
}: {
  readonly initial?: JSONContent | undefined;
  readonly onPersist?: ((document: JSONContent) => void) | undefined;
  readonly library: RichEditorLibrary;
  readonly onSaveRecordPresentation: SaveRecordPresentation;
  readonly onLoadAssetPreview: LoadAssetPreview;
  readonly onImportMedia: ImportMedia;
}) {
  const messages = useMessages();
  const [document, setDocument] = useState<JSONContent>(initial ?? RICH_TEXT_SEED);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const handleChange = (next: JSONContent) => {
    setDocument(next);
    if (!onPersist) return;
    // Debounce so typing does not write on every keystroke.
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      onPersist(next);
    }, 700);
  };

  return (
    <RichEditor
      value={document}
      onChange={handleChange}
      ariaLabel={messages.lesson.richTextAria}
      library={library}
      onSaveRecordPresentation={onSaveRecordPresentation}
      onLoadAssetPreview={onLoadAssetPreview}
      onImportMedia={onImportMedia}
    />
  );
}

function EditorBody({
  part,
  onPersist,
  onPersistExercise,
  library,
  onSaveRecordPresentation,
  onLoadAssetPreview,
  onImportMedia,
}: {
  readonly part: Part;
  readonly onPersist?: ((document: JSONContent) => void) | undefined;
  readonly onPersistExercise: (exercise: Exercise) => void;
  readonly library: RichEditorLibrary;
  readonly onSaveRecordPresentation: SaveRecordPresentation;
  readonly onLoadAssetPreview: LoadAssetPreview;
  readonly onImportMedia: ImportMedia;
}) {
  const kind = partKind(part.content);
  const isTiptap = part.content.kind === "tiptap";
  const initial = isTiptap ? (part.content.document as unknown as JSONContent) : undefined;
  const exercise = part.content.kind === "exercise" ? part.content.exercise : undefined;
  const editorContext = useMemo(
    () => ({ library, loadAssetPreview: onLoadAssetPreview }),
    [library, onLoadAssetPreview],
  );

  if (kind === "rich-text") {
    // Only real tiptap parts persist; composition placeholders do not.
    return (
      <RichTextEditor
        initial={initial}
        onPersist={isTiptap ? onPersist : undefined}
        library={library}
        onSaveRecordPresentation={onSaveRecordPresentation}
        onLoadAssetPreview={onLoadAssetPreview}
        onImportMedia={onImportMedia}
      />
    );
  }

  const exerciseBody = () => {
    switch (kind) {
      case "multiple-choice":
        return exercise?.type === "multiple-choice" ? (
          <MultipleChoiceEditor
            exercise={exercise}
            library={library}
            onChange={onPersistExercise}
            optionSource={exercise.presentation?.layout === "image-grid" ? "asset" : undefined}
          />
        ) : null;
      case "match-pairs":
        return exercise?.type === "match-pairs" ? (
          <MatchPairsEditor exercise={exercise} library={library} onChange={onPersistExercise} />
        ) : null;
      case "fill-blank":
        return exercise?.type === "fill-blank" ? (
          <FillBlankEditor exercise={exercise} library={library} onChange={onPersistExercise} />
        ) : null;
      case "word-order":
        return exercise?.type === "word-order" ? (
          <WordOrderEditor exercise={exercise} library={library} onChange={onPersistExercise} />
        ) : null;
      case "listen":
        return exercise?.type === "listening" ? (
          <ListeningEditor exercise={exercise} library={library} onChange={onPersistExercise} />
        ) : null;
      case "speak":
        return exercise?.type === "speaking" ? (
          <SpeakingEditor exercise={exercise} library={library} onChange={onPersistExercise} />
        ) : null;
      case "unknown":
        return <UnsupportedPart content={part.content} />;
    }
  };

  return (
    <RichEditorProvider value={editorContext}>
      <div className={styles.exercisePane}>{exerciseBody()}</div>
    </RichEditorProvider>
  );
}

function UnsupportedPart({ content }: { readonly content: PartContent }) {
  const t = useMessages().lesson;
  const format = useFormat();
  const label = content.kind === "unknown" ? (content.declaredType ?? content.declaredKind) : "";
  return (
    <div className={styles.unsupported} role="note">
      <p className={styles.unsupportedTitle}>{t.unsupportedTitle}</p>
      <p className={styles.unsupportedBody}>{format(t.unsupportedBody, { type: label })}</p>
    </div>
  );
}

export type SaveState = "idle" | "saving" | "saved" | "failed";

export interface PartEditorProps {
  readonly part: Part;
  readonly course: Course;
  readonly onSaveDocument: (
    partId: string,
    document: TiptapDocument,
  ) => Promise<ProjectWriteResult>;
  readonly onSaveExercise: (partId: string, exercise: Exercise) => Promise<ProjectWriteResult>;
  readonly onSaveRecord: (record: ContentRecord) => Promise<ProjectWriteResult>;
  readonly onLoadAssetPreview: LoadAssetPreview;
  readonly onImportMedia: () => Promise<Asset | null>;
  readonly onSaveStateChange?: ((state: SaveState) => void) | undefined;
}

export function PartEditor({
  part,
  course,
  onSaveDocument,
  onSaveExercise,
  onSaveRecord,
  onLoadAssetPreview,
  onImportMedia,
  onSaveStateChange,
}: PartEditorProps) {
  const messages = useMessages();
  const t = messages.lesson;
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const exerciseTimer = useRef<number | null>(null);

  useEffect(() => {
    onSaveStateChange?.(saveState);
  }, [saveState, onSaveStateChange]);

  useEffect(
    () => () => {
      if (exerciseTimer.current !== null) window.clearTimeout(exerciseTimer.current);
    },
    [],
  );

  const library = useMemo(() => courseToRichLibrary(course), [course]);

  const saveRecordPresentation: SaveRecordPresentation = (recordId, presentation) => {
    const record = course.records.find((entry) => entry.id === recordId);
    if (!record) return;
    const next: EditorPresentation[] = [
      ...(record.presentations ?? []).filter((entry) => entry.id !== presentation.id),
      presentation,
    ];
    void onSaveRecord({ ...record, presentations: next });
  };

  const importMedia: ImportMedia = async () => {
    const asset = await onImportMedia();
    if (!asset) return null;
    const editorAsset: EditorAsset = {
      id: asset.id,
      kind: asset.kind,
      label: asset.label,
      file: asset.file,
    };
    return editorAsset;
  };

  const persist = (document: JSONContent) => {
    setSaveState("saving");
    void onSaveDocument(part.id, document as unknown as TiptapDocument).then((result) => {
      setSaveState(result.status === "saved" ? "saved" : "failed");
    });
  };

  const persistExercise = (exercise: Exercise) => {
    setSaveState("saving");
    if (exerciseTimer.current !== null) window.clearTimeout(exerciseTimer.current);
    exerciseTimer.current = window.setTimeout(() => {
      void onSaveExercise(part.id, exercise).then((result) => {
        setSaveState(result.status === "saved" ? "saved" : "failed");
      });
    }, 700);
  };

  return (
    <section className={styles.editorArea} aria-label={t.editorAria}>
      <EditorBody
        key={part.id}
        part={part}
        onPersist={persist}
        onPersistExercise={persistExercise}
        library={library}
        onSaveRecordPresentation={saveRecordPresentation}
        onLoadAssetPreview={onLoadAssetPreview}
        onImportMedia={importMedia}
      />
    </section>
  );
}
