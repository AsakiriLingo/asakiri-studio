import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/react";
import type { Asset, ContentRecord, Course, Exercise, Part, TiptapDocument } from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import { useMessages } from "@shared/i18n";
import { Field, TextArea } from "@shared/components/form";
import { Icon } from "@shared/components/icon";
import { PanelHeader } from "@shared/components/panel";
import {
  RichEditor,
  type EditorAsset,
  type EditorPresentation,
  type ImportMedia,
  type LoadAssetPreview,
  type RichEditorLibrary,
  type SaveRecordPresentation,
} from "@shared/components/rich-editor";
import { Select } from "@shared/components/select";
import { Status } from "@shared/components/status";
import { Tag } from "@shared/components/tag";
import { partKind, type PartKind } from "@features/lesson-editor/parts";
import { FillBlankEditor } from "@features/lesson-editor/exercise/FillBlankEditor";
import { ListeningEditor } from "@features/lesson-editor/exercise/ListeningEditor";
import { MatchPairsEditor } from "@features/lesson-editor/exercise/MatchPairsEditor";
import { MultipleChoiceEditor } from "@features/lesson-editor/exercise/MultipleChoiceEditor";
import { WordOrderEditor } from "@features/lesson-editor/exercise/WordOrderEditor";
import { courseToRichLibrary } from "@features/lesson-editor/rich-library";
import styles from "@features/lesson-editor/LessonEditor.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

function Tabs({ labels }: { readonly labels: readonly string[] }) {
  const messages = useMessages();
  const [selected, setSelected] = useState(0);
  return (
    <div className={styles.lessonType} role="tablist" aria-label={messages.lesson.editorModesAria}>
      {labels.map((label, index) => (
        <button
          key={label}
          className={styles.tab}
          type="button"
          role="tab"
          aria-selected={index === selected}
          onClick={() => {
            setSelected(index);
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PromptField({
  label,
  value,
  help,
}: {
  readonly label: string;
  readonly value: string;
  readonly help: string;
}) {
  return (
    <Field label={label} help={help}>
      <TextArea defaultValue={value} rows={2} />
    </Field>
  );
}

// Example content only; roleKind selects which localized role options to show.
interface OptionData {
  readonly index: ReactNode;
  readonly title: string;
  readonly mono?: string;
  readonly detail?: string;
  readonly values: readonly string[];
  readonly roleKind?: "correct" | "answer";
  readonly role?: string;
  readonly trailing?: ReactNode;
}

function OptionRow({ option }: { readonly option: OptionData }) {
  const messages = useMessages();
  const t = messages.lesson;
  const roleItems =
    option.roleKind === "answer"
      ? [
          { value: "answer", label: t.roleAnswer },
          { value: "distractor", label: t.roleDistractor },
        ]
      : [
          { value: "correct", label: t.roleCorrect },
          { value: "distractor", label: t.roleDistractor },
        ];
  return (
    <div className={styles.optionRow}>
      <span className={styles.optionIndex}>{option.index}</span>
      <span>
        <span className={styles.rowTitle}>{option.title}</span>
        {option.mono === undefined ? null : (
          <span className={joinClassNames(styles.rowDetail, styles.mono)}>{option.mono}</span>
        )}
        {option.detail === undefined ? null : (
          <span className={styles.rowDetail}>{option.detail}</span>
        )}
        {option.values.length === 0 ? null : (
          <span className={styles.optionValues}>
            {option.values.map((value) => (
              <Tag key={value}>{value}</Tag>
            ))}
          </span>
        )}
      </span>
      {option.roleKind === undefined ? (
        option.trailing
      ) : (
        <Select
          className={styles.roleSelect}
          aria-label={t.roleFor(option.title)}
          items={roleItems}
          defaultValue={option.role}
        />
      )}
    </div>
  );
}

function SpeakButton({ children }: { readonly children: ReactNode }) {
  return (
    <button className={styles.speakButton} type="button">
      <Icon name="audio" size={18} />
      {children}
    </button>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}) {
  return (
    <div>
      <PanelHeader title={title} description={description} />
      {children}
    </div>
  );
}

function SettingRow({ name, detail }: { readonly name: string; readonly detail: string }) {
  const messages = useMessages();
  return (
    <div className={styles.settingRow}>
      <span>
        <span className={styles.settingName}>{name}</span>
        <span className={styles.settingDetail}>{detail}</span>
      </span>
      <Tag variant="accent">{messages.common.on}</Tag>
    </div>
  );
}

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

function SpeakEditor() {
  const messages = useMessages();
  const t = messages.lesson;
  return (
    <>
      <div className={styles.callout}>
        <Icon name="mic" size={18} />
        <span>
          <strong>{t.speakCalloutStrong}</strong>
          <br />
          {t.speakCalloutBody}
        </span>
      </div>
      <div className={styles.formGrid}>
        <PromptField
          label={t.prompt}
          value="Say this word in Japanese."
          help="Shown above the phrase while the learner speaks."
        />
        <Panel title={t.exercise.phraseTitle} description={t.exercise.phraseDesc}>
          <div className={styles.optionList}>
            <OptionRow
              option={{
                index: <Icon name="mic" size={18} />,
                title: "Vocabulary / 猫",
                detail: "Target · reads “neko”",
                values: ["猫", "neko", "Model audio · neko-ja.mp3"],
                trailing: <SpeakButton>{messages.common.play}</SpeakButton>,
              }}
            />
          </div>
        </Panel>
        <Field label={t.strictnessLabel} help={t.strictnessHelp}>
          <Select
            name="strictness"
            defaultValue="standard"
            aria-label={t.strictnessLabel}
            items={[
              { value: "lenient", label: t.strictnessLenient },
              { value: "standard", label: t.strictnessStandard },
              { value: "strict", label: t.strictnessStrict },
            ]}
          />
        </Field>
        <div className={styles.settingGroup}>
          <SettingRow name={t.settingShowRomaji} detail={t.settingShowRomajiDetail} />
          <SettingRow name={t.settingAllowSkip} detail={t.settingAllowSkipMicDetail} />
        </div>
      </div>
    </>
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
  switch (kind) {
    case "rich-text":
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
    case "select-image":
      return exercise?.type === "select-image" ? (
        <MultipleChoiceEditor
          exercise={exercise}
          library={library}
          onChange={onPersistExercise}
          optionSource="asset"
        />
      ) : null;
    case "multiple-choice":
      return exercise?.type === "multiple-choice" ? (
        <MultipleChoiceEditor exercise={exercise} library={library} onChange={onPersistExercise} />
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
      return <SpeakEditor />;
  }
}

type SaveState = "idle" | "saving" | "saved" | "failed";

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
}

const REAL_EXERCISE_EDITORS = new Set<PartKind>([
  "multiple-choice",
  "select-image",
  "word-order",
  "fill-blank",
  "match-pairs",
  "listen",
]);

export function PartEditor({
  part,
  course,
  onSaveDocument,
  onSaveExercise,
  onSaveRecord,
  onLoadAssetPreview,
  onImportMedia,
}: PartEditorProps) {
  const messages = useMessages();
  const t = messages.lesson;
  const kind = partKind(part.content);
  const tabLabels =
    kind === "rich-text" ? [t.tabWrite, t.tabReferences] : [t.tabOptions, t.tabFeedback];
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const exerciseTimer = useRef<number | null>(null);

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

  const statusLabel =
    saveState === "saving"
      ? messages.common.saving
      : saveState === "failed"
        ? messages.common.saveFailed
        : messages.common.saved;

  return (
    <section className={styles.editorArea} aria-label={t.editorAria}>
      <div className={styles.partHeading}>
        <span>
          <span className={styles.partName}>{part.title}</span>
          <span className={styles.rowDetail}>{t.partHeading(t.kind[kind])}</span>
        </span>
        <Status tone={saveState === "failed" ? "warning" : "default"}>{statusLabel}</Status>
      </div>
      {REAL_EXERCISE_EDITORS.has(kind) ? null : <Tabs labels={tabLabels} />}
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
