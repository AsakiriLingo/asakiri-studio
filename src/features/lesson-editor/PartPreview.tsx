import { useEffect, useRef, useState, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/react";
import type {
  Asset,
  BindingResolver,
  ContentRecord,
  Course,
  Part,
  ResolvedValue,
} from "@core/course";
import { createBindingResolver } from "@core/course";
import { useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import { RichContent, type LoadAssetPreview } from "@shared/components/rich-editor";
import { Status } from "@shared/components/status";
import { partKind, type PartKind } from "@features/lesson-editor/parts";
import { courseToRichLibrary } from "@features/lesson-editor/rich-library";
import styles from "@features/lesson-editor/LessonEditor.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

function SpeakButton({ children }: { readonly children: ReactNode }) {
  return (
    <button className={styles.speakButton} type="button">
      <Icon name="audio" size={18} />
      {children}
    </button>
  );
}

function RichTextPreview({
  part,
  course,
  onLoadAssetPreview,
}: {
  readonly part: Part;
  readonly course: Course;
  readonly onLoadAssetPreview: LoadAssetPreview;
}) {
  if (part.content.kind !== "tiptap") {
    return <p className={styles.exerciseHint}>This part has no rich-text content to preview.</p>;
  }
  return (
    <>
      <h2>{part.title}</h2>
      <RichContent
        value={part.content.document as unknown as JSONContent}
        library={courseToRichLibrary(course)}
        onLoadAssetPreview={onLoadAssetPreview}
      />
    </>
  );
}

function recordPreviewLabel(record: ContentRecord): string {
  const text = Object.values(record.fields).find((value) => value.kind === "text");
  return text?.kind === "text" ? text.value : record.id;
}

function resolvedText(resolved: ResolvedValue): string {
  switch (resolved.kind) {
    case "text":
      return resolved.text;
    case "asset":
      return resolved.label ?? resolved.asset.label;
    case "record":
      return recordPreviewLabel(resolved.record);
    case "list":
      return resolved.items.map(resolvedText).join(" · ");
    case "literal":
      return typeof resolved.value === "string" ? resolved.value : JSON.stringify(resolved.value);
    case "missing":
      return "—";
  }
}

function fragmentText(
  fragment: { readonly binding: Parameters<BindingResolver["resolve"]>[0] } | undefined,
  resolver: BindingResolver,
): string {
  return fragment ? resolvedText(resolver.resolve(fragment.binding)) : "";
}

function MultipleChoicePreview({ part, course }: { readonly part: Part; readonly course: Course }) {
  const messages = useMessages();
  if (part.content.kind !== "exercise" || part.content.exercise.type !== "multiple-choice") {
    return null;
  }
  const exercise = part.content.exercise;
  const resolver = createBindingResolver(course);
  const prompt = fragmentText(exercise.prompt[0], resolver);
  return (
    <>
      <p className={styles.muted}>{messages.lesson.kind["multiple-choice"]}</p>
      <h2>{prompt || part.title}</h2>
      {exercise.options.length === 0 ? (
        <p className={styles.exerciseHint}>{messages.lesson.previewNoOptions}</p>
      ) : (
        exercise.options.map((option, index) => {
          const correct = exercise.evaluation.correctOptionIds.includes(option.id);
          const label = fragmentText(option.body[0], resolver);
          return (
            <button
              key={option.id}
              className={joinClassNames(
                styles.previewOption,
                correct ? styles.selected : undefined,
              )}
              type="button"
            >
              {label || String.fromCharCode(65 + index)}
            </button>
          );
        })
      )}
    </>
  );
}

const thumbCache = new Map<string, Promise<string | null>>();

function useAssetThumb(asset: Asset | undefined, load: LoadAssetPreview): string | null {
  const [loaded, setLoaded] = useState<{ readonly id: string; readonly url: string } | null>(null);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const previewable =
    asset?.kind === "image" && asset.availability === "ready" && asset.file ? asset.id : null;

  useEffect(() => {
    if (!previewable) return;
    let cancelled = false;
    let promise = thumbCache.get(previewable);
    if (!promise) {
      promise = loadRef.current(previewable);
      thumbCache.set(previewable, promise);
    }
    void promise.then((url) => {
      if (!cancelled && url) setLoaded({ id: previewable, url });
    });
    return () => {
      cancelled = true;
    };
  }, [previewable]);

  return loaded?.id === previewable ? loaded.url : null;
}

function OptionThumb({
  asset,
  load,
}: {
  readonly asset: Asset | undefined;
  readonly load: LoadAssetPreview;
}) {
  const url = useAssetThumb(asset, load);
  return url ? (
    <img className={styles.optionThumbImage} src={url} alt="" loading="lazy" decoding="async" />
  ) : (
    <Icon name="image" size={18} />
  );
}

function SelectImagePreview({
  part,
  course,
  onLoadAssetPreview,
}: {
  readonly part: Part;
  readonly course: Course;
  readonly onLoadAssetPreview: LoadAssetPreview;
}) {
  const messages = useMessages();
  if (part.content.kind !== "exercise" || part.content.exercise.type !== "select-image") {
    return null;
  }
  const exercise = part.content.exercise;
  const resolver = createBindingResolver(course);
  const prompt = fragmentText(exercise.prompt[0], resolver);
  return (
    <>
      <p className={styles.muted}>{messages.lesson.kind["select-image"]}</p>
      <h2>{prompt || part.title}</h2>
      {exercise.options.length === 0 ? (
        <p className={styles.exerciseHint}>{messages.lesson.previewNoOptions}</p>
      ) : (
        <div className={styles.imageChoiceGrid}>
          {exercise.options.map((option) => {
            const correct = exercise.evaluation.correctOptionIds.includes(option.id);
            const resolved = option.body[0] ? resolver.resolve(option.body[0].binding) : null;
            const asset = resolved?.kind === "asset" ? resolved.asset : undefined;
            return (
              <button
                key={option.id}
                className={joinClassNames(
                  styles.imageChoice,
                  correct ? styles.selected : undefined,
                )}
                type="button"
              >
                <span className={styles.imageThumb}>
                  <OptionThumb asset={asset} load={onLoadAssetPreview} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function MatchPreview() {
  return (
    <>
      <p className={styles.muted}>Match the words</p>
      <h2>Match each word to its meaning</h2>
      <div className={styles.matchGrid}>
        <div className={styles.matchCol}>
          <button className={joinClassNames(styles.matchChip, styles.matched)} type="button">
            <span className={styles.matchNum}>1</span>猫
          </button>
          <button className={joinClassNames(styles.matchChip, styles.selected)} type="button">
            犬
          </button>
          <button className={styles.matchChip} type="button">
            鳥
          </button>
          <button className={styles.matchChip} type="button">
            魚
          </button>
        </div>
        <div className={styles.matchCol}>
          <button className={styles.matchChip} type="button">
            Bird
          </button>
          <button className={joinClassNames(styles.matchChip, styles.matched)} type="button">
            <span className={styles.matchNum}>1</span>Cat
          </button>
          <button className={styles.matchChip} type="button">
            Fish
          </button>
          <button className={styles.matchChip} type="button">
            Dog
          </button>
        </div>
      </div>
      <p className={styles.exerciseHint}>
        猫 ↔ Cat is matched. 犬 is selected — tap its meaning to make the next pair.
      </p>
    </>
  );
}

function FillBlankPreview({ part, course }: { readonly part: Part; readonly course: Course }) {
  const messages = useMessages();
  if (part.content.kind !== "exercise" || part.content.exercise.type !== "fill-blank") {
    return null;
  }
  const exercise = part.content.exercise;
  const resolver = createBindingResolver(course);
  const bank = exercise.bank ?? [];
  const translation = exercise.translation ? fragmentText(exercise.translation, resolver) : "";
  const tileLabel = (tileId: string | undefined): string => {
    const tile = bank.find((entry) => entry.id === tileId);
    return tile ? fragmentText(tile.body[0], resolver) : "";
  };
  const blankAnswer = (blankId: string): string => {
    const blank = exercise.evaluation.blanks.find((entry) => entry.blankId === blankId);
    return tileLabel(blank?.correctOptionIds?.[0]);
  };
  const prompt = fragmentText(exercise.prompt[0], resolver);
  return (
    <>
      <p className={styles.muted}>{messages.lesson.kind["fill-blank"]}</p>
      {prompt ? <h2>{prompt}</h2> : null}
      {exercise.stem.length === 0 ? (
        <p className={styles.exerciseHint}>{messages.lesson.previewNoSentence}</p>
      ) : (
        <p className={styles.clozeSentence}>
          {exercise.stem.map((segment) =>
            segment.kind === "text" ? (
              <span key={segment.fragment.id}>{fragmentText(segment.fragment, resolver)}</span>
            ) : (
              <span key={segment.id} className={joinClassNames(styles.blank, styles.filled)}>
                {blankAnswer(segment.id) || "___"}
              </span>
            ),
          )}
        </p>
      )}
      {translation ? <p className={styles.muted}>{translation}</p> : null}
      {bank.length === 0 ? null : (
        <div className={styles.wordBank}>
          {bank.map((tile) => (
            <button key={tile.id} className={styles.wordChip} type="button">
              {fragmentText(tile.body[0], resolver) || "—"}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function WordOrderPreview({ part, course }: { readonly part: Part; readonly course: Course }) {
  const messages = useMessages();
  if (part.content.kind !== "exercise" || part.content.exercise.type !== "word-order") {
    return null;
  }
  const exercise = part.content.exercise;
  const resolver = createBindingResolver(course);
  const prompt = fragmentText(exercise.prompt[0], resolver);
  const bank = [...exercise.tokens, ...(exercise.distractors ?? [])];
  return (
    <>
      <p className={styles.muted}>{messages.lesson.kind["word-order"]}</p>
      <h2>{prompt || part.title}</h2>
      {exercise.tokens.length === 0 ? (
        <p className={styles.exerciseHint}>{messages.lesson.previewNoOptions}</p>
      ) : (
        <div className={styles.sentenceBuild}>
          <div className={styles.answerTrack}>
            {exercise.tokens.map((token) => (
              <span key={token.id} className={styles.token}>
                {fragmentText(token.body[0], resolver) || "—"}
              </span>
            ))}
          </div>
          <div className={styles.wordBank}>
            {bank.map((token) => (
              <button key={token.id} className={styles.wordChip} type="button">
                {fragmentText(token.body[0], resolver) || "—"}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ListenPreview() {
  return (
    <>
      <p className={styles.muted}>Listening</p>
      <h2>Tap the word you hear</h2>
      <button className={styles.audioPlay} type="button" aria-label="Play audio">
        <Icon name="audio" size={18} />
      </button>
      <div className={styles.listenTools}>
        <SpeakButton>Slow · 0.5×</SpeakButton>
      </div>
      <div className={styles.wordBank}>
        <button className={joinClassNames(styles.wordChip, styles.selected)} type="button">
          猫
        </button>
        <button className={styles.wordChip} type="button">
          犬
        </button>
        <button className={styles.wordChip} type="button">
          鳥
        </button>
        <button className={styles.wordChip} type="button">
          魚
        </button>
      </div>
      <p className={styles.exerciseHint}>
        Plays the linked recording (neko-ja.mp3). Source audio is uploaded or from Tatoeba.
      </p>
      <button className={styles.skipLink} type="button">
        Can&rsquo;t listen right now
      </button>
    </>
  );
}

function SpeakPreview() {
  return (
    <>
      <p className={styles.muted}>Speaking</p>
      <h2>Say this word</h2>
      <div className={styles.speakTarget}>
        <span className={styles.phrase}>猫</span>
        <span className={styles.reading}>neko</span>
        <SpeakButton>Hear it</SpeakButton>
      </div>
      <button className={styles.micButton} type="button" aria-label="Start speaking">
        <Icon name="mic" size={18} />
      </button>
      <p className={styles.micLabel}>Tap the mic and say it out loud</p>
      <p className={styles.exerciseHint}>
        Recording and pronunciation checking happen on the learner&rsquo;s device — nothing is
        uploaded, and it can&rsquo;t be tried from Studio.
      </p>
      <button className={styles.skipLink} type="button">
        Can&rsquo;t speak right now
      </button>
    </>
  );
}

function PreviewBody({
  kind,
  part,
  course,
  onLoadAssetPreview,
}: {
  readonly kind: PartKind;
  readonly part: Part;
  readonly course: Course;
  readonly onLoadAssetPreview: LoadAssetPreview;
}) {
  switch (kind) {
    case "rich-text":
      return (
        <RichTextPreview part={part} course={course} onLoadAssetPreview={onLoadAssetPreview} />
      );
    case "select-image":
      return (
        <SelectImagePreview part={part} course={course} onLoadAssetPreview={onLoadAssetPreview} />
      );
    case "multiple-choice":
      return <MultipleChoicePreview part={part} course={course} />;
    case "match-pairs":
      return <MatchPreview />;
    case "fill-blank":
      return <FillBlankPreview part={part} course={course} />;
    case "word-order":
      return <WordOrderPreview part={part} course={course} />;
    case "listen":
      return <ListenPreview />;
    case "speak":
      return <SpeakPreview />;
  }
}

export function PartPreview({
  part,
  course,
  onLoadAssetPreview,
}: {
  readonly part: Part;
  readonly course: Course;
  readonly onLoadAssetPreview: LoadAssetPreview;
}) {
  const messages = useMessages();
  const t = messages.lesson;
  const kind = partKind(part.content);
  const runsOnDevice = kind === "speak";
  return (
    <aside className={styles.previewPane} aria-label={t.previewAria}>
      <div className={styles.previewSurface}>
        <div className={styles.previewHeader}>
          <span>{t.learnerPreview}</span>
          {runsOnDevice ? (
            <Status tone="warning">{t.runsOnDevice}</Status>
          ) : (
            <Status>{t.currentPart}</Status>
          )}
        </div>
        <div className={styles.previewBody}>
          <PreviewBody
            kind={kind}
            part={part}
            course={course}
            onLoadAssetPreview={onLoadAssetPreview}
          />
        </div>
      </div>
    </aside>
  );
}
