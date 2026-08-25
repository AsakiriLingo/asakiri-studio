import { useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import type {
  Asset,
  BindingResolver,
  ContentRecord,
  Course,
  MatchPairsExercise,
  Part,
  PartDisplayKind,
  RenderFragment,
  ResolvedValue,
} from "@core/course";
import { createBindingResolver, partKind } from "@core/course";
import { useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import {
  RichContent,
  type LoadAssetPreview,
  type RichEditorLibrary,
} from "@shared/components/rich-editor";
import styles from "@features/part-preview/PartPreview.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

function RichTextPreview({
  part,
  library,
  onLoadAssetPreview,
}: {
  readonly part: Part;
  readonly library: RichEditorLibrary;
  readonly onLoadAssetPreview: LoadAssetPreview;
}) {
  if (part.content.kind !== "tiptap") {
    return <p className={styles.exerciseHint}>This part has no rich-text content to preview.</p>;
  }
  const heading = part.content.title ?? part.title;
  return (
    <>
      {heading ? <h2>{heading}</h2> : null}
      <RichContent
        value={part.content.document as unknown as JSONContent}
        library={library}
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
      return "…";
  }
}

function fragmentText(
  fragment: { readonly binding: Parameters<BindingResolver["resolve"]>[0] } | undefined,
  resolver: BindingResolver,
): string {
  return fragment ? resolvedText(resolver.resolve(fragment.binding)) : "";
}

function MultipleChoicePreview({
  part,
  course,
  onLoadAssetPreview,
}: {
  readonly part: Part;
  readonly course: Course;
  readonly onLoadAssetPreview: LoadAssetPreview;
}) {
  const messages = useMessages();
  if (part.content.kind !== "exercise" || part.content.exercise.type !== "multiple-choice") {
    return null;
  }
  const exercise = part.content.exercise;
  const resolver = createBindingResolver(course);
  const prompt = fragmentText(exercise.prompt[0], resolver);
  const imageGrid = exercise.presentation?.layout === "image-grid";
  return (
    <>
      <p className={styles.muted}>{messages.lesson.kind["multiple-choice"]}</p>
      <h2>{prompt || part.title}</h2>
      {exercise.options.length === 0 ? (
        <p className={styles.exerciseHint}>{messages.lesson.previewNoOptions}</p>
      ) : imageGrid ? (
        <div className={styles.imageChoiceGrid}>
          {exercise.options.map((option) => {
            const correct = exercise.evaluation.correctOptionIds.includes(option.id);
            const imageFragment =
              option.body.find((fragment) => fragmentAsset(fragment, resolver)?.kind === "image") ??
              option.body[0];
            const asset = imageFragment ? fragmentAsset(imageFragment, resolver) : undefined;
            const captions = option.body.filter((fragment) => fragment !== imageFragment);
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
                {captions.length > 0 ? (
                  <FragmentBody
                    body={captions}
                    resolver={resolver}
                    onLoadAssetPreview={onLoadAssetPreview}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        exercise.options.map((option, index) => {
          const correct = exercise.evaluation.correctOptionIds.includes(option.id);
          return (
            <button
              key={option.id}
              className={joinClassNames(
                styles.previewOption,
                correct ? styles.selected : undefined,
              )}
              type="button"
            >
              <FragmentBody
                body={option.body}
                resolver={resolver}
                onLoadAssetPreview={onLoadAssetPreview}
                fallback={String.fromCharCode(65 + index)}
              />
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

function fragmentAsset(fragment: RenderFragment, resolver: BindingResolver): Asset | undefined {
  const resolved = resolver.resolve(fragment.binding);
  return resolved.kind === "asset" ? resolved.asset : undefined;
}

function InlineThumb({ asset, load }: { readonly asset: Asset; readonly load: LoadAssetPreview }) {
  const url = useAssetThumb(asset, load);
  return url ? (
    <img className={styles.inlineThumbImage} src={url} alt="" loading="lazy" decoding="async" />
  ) : (
    <Icon name="image" size={16} />
  );
}

function FragmentBody({
  body,
  resolver,
  onLoadAssetPreview,
  fallback,
}: {
  readonly body: readonly RenderFragment[];
  readonly resolver: BindingResolver;
  readonly onLoadAssetPreview: LoadAssetPreview;
  readonly fallback?: string;
}) {
  const pieces = body.flatMap((fragment) => {
    const resolved = resolver.resolve(fragment.binding);
    if (resolved.kind === "asset" && resolved.asset.kind === "audio") {
      return [
        <span key={fragment.id} className={styles.fragmentAudio} aria-hidden="true">
          <Icon name="audio" size={16} />
        </span>,
      ];
    }
    if (resolved.kind === "asset" && resolved.asset.kind === "image") {
      return [
        <span key={fragment.id} className={styles.inlineThumb}>
          <InlineThumb asset={resolved.asset} load={onLoadAssetPreview} />
        </span>,
      ];
    }
    const text = resolvedText(resolved);
    return text ? [<span key={fragment.id}>{text}</span>] : [];
  });

  if (pieces.length === 0) {
    return <>{fallback ?? ""}</>;
  }
  return <span className={styles.fragmentBody}>{pieces}</span>;
}

function MatchPreview({
  part,
  course,
  onLoadAssetPreview,
}: {
  readonly part: Part;
  readonly course: Course;
  readonly onLoadAssetPreview: LoadAssetPreview;
}) {
  const messages = useMessages();
  if (part.content.kind !== "exercise" || part.content.exercise.type !== "match-pairs") {
    return null;
  }
  const exercise = part.content.exercise;
  const resolver = createBindingResolver(course);
  const prompt = fragmentText(exercise.prompt[0], resolver);
  const pairNumber = new Map<string, number>();
  exercise.evaluation.pairs.forEach((pair, index) => {
    pairNumber.set(pair.leftId, index + 1);
    pairNumber.set(pair.rightId, index + 1);
  });
  const column = (options: MatchPairsExercise["left"]) =>
    options.map((option) => {
      const number = pairNumber.get(option.id);
      return (
        <button key={option.id} className={styles.matchChip} type="button">
          {number === undefined ? null : <span className={styles.matchNum}>{number}</span>}
          <FragmentBody
            body={option.body}
            resolver={resolver}
            onLoadAssetPreview={onLoadAssetPreview}
            fallback="…"
          />
        </button>
      );
    });
  return (
    <>
      <p className={styles.muted}>{messages.lesson.kind["match-pairs"]}</p>
      {prompt ? <h2>{prompt}</h2> : null}
      {exercise.evaluation.pairs.length === 0 ? (
        <p className={styles.exerciseHint}>{messages.lesson.previewNoPairs}</p>
      ) : (
        <div className={styles.matchGrid}>
          <div className={styles.matchCol}>{column(exercise.left)}</div>
          <div className={styles.matchCol}>{column(exercise.right)}</div>
        </div>
      )}
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
              {fragmentText(tile.body[0], resolver) || "…"}
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
                {fragmentText(token.body[0], resolver) || "…"}
              </span>
            ))}
          </div>
          <div className={styles.wordBank}>
            {bank.map((token) => (
              <button key={token.id} className={styles.wordChip} type="button">
                {fragmentText(token.body[0], resolver) || "…"}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ListenPreview({
  part,
  course,
  onLoadAssetPreview,
}: {
  readonly part: Part;
  readonly course: Course;
  readonly onLoadAssetPreview: LoadAssetPreview;
}) {
  const messages = useMessages();
  if (part.content.kind !== "exercise" || part.content.exercise.type !== "listening") {
    return null;
  }
  const exercise = part.content.exercise;
  const resolver = createBindingResolver(course);
  const prompt = fragmentText(exercise.prompt[0], resolver);
  const options = exercise.options ?? [];
  return (
    <>
      <p className={styles.muted}>{messages.lesson.kind.listen}</p>
      {prompt ? <h2>{prompt}</h2> : null}
      <button className={styles.audioPlay} type="button" aria-label={messages.common.play}>
        <Icon name="audio" size={18} />
      </button>
      {exercise.answerMode === "type" ? (
        <p className={styles.exerciseHint}>{messages.lesson.answerModeType}</p>
      ) : options.length === 0 ? (
        <p className={styles.exerciseHint}>{messages.lesson.previewNoOptions}</p>
      ) : (
        <div className={styles.wordBank}>
          {options.map((option) => {
            const correct =
              exercise.evaluation.kind === "selected-options" &&
              exercise.evaluation.correctOptionIds.includes(option.id);
            return (
              <button
                key={option.id}
                className={joinClassNames(styles.wordChip, correct ? styles.selected : undefined)}
                type="button"
              >
                <FragmentBody
                  body={option.body}
                  resolver={resolver}
                  onLoadAssetPreview={onLoadAssetPreview}
                  fallback="…"
                />
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function SpeakPreview({ part, course }: { readonly part: Part; readonly course: Course }) {
  const messages = useMessages();
  if (part.content.kind !== "exercise" || part.content.exercise.type !== "speaking") {
    return null;
  }
  const exercise = part.content.exercise;
  const resolver = createBindingResolver(course);
  const prompt = fragmentText(exercise.prompt[0], resolver);
  const targetResolved = resolver.resolve(exercise.target.binding);
  const targetIsAsset = targetResolved.kind === "asset";
  return (
    <>
      <p className={styles.muted}>{messages.lesson.kind.speak}</p>
      {prompt ? <h2>{prompt}</h2> : null}
      <div className={styles.speakTarget}>
        {targetIsAsset ? (
          <button className={styles.audioPlay} type="button" aria-label={messages.common.play}>
            <Icon name="audio" size={18} />
          </button>
        ) : (
          <span className={styles.phrase}>{resolvedText(targetResolved) || "…"}</span>
        )}
      </div>
      <button
        className={styles.micButton}
        type="button"
        aria-label={messages.lesson.speakPreviewMic}
      >
        <Icon name="mic" size={18} />
      </button>
      <p className={styles.micLabel}>{messages.lesson.speakPreviewTap}</p>
      <p className={styles.exerciseHint}>{messages.lesson.speakCalloutBody}</p>
    </>
  );
}

function PreviewBody({
  kind,
  part,
  course,
  library,
  onLoadAssetPreview,
}: {
  readonly kind: PartDisplayKind;
  readonly part: Part;
  readonly course: Course;
  readonly library: RichEditorLibrary;
  readonly onLoadAssetPreview: LoadAssetPreview;
}) {
  switch (kind) {
    case "rich-text":
      return (
        <RichTextPreview part={part} library={library} onLoadAssetPreview={onLoadAssetPreview} />
      );
    case "multiple-choice":
      return (
        <MultipleChoicePreview
          part={part}
          course={course}
          onLoadAssetPreview={onLoadAssetPreview}
        />
      );
    case "match-pairs":
      return <MatchPreview part={part} course={course} onLoadAssetPreview={onLoadAssetPreview} />;
    case "fill-blank":
      return <FillBlankPreview part={part} course={course} />;
    case "word-order":
      return <WordOrderPreview part={part} course={course} />;
    case "listen":
      return <ListenPreview part={part} course={course} onLoadAssetPreview={onLoadAssetPreview} />;
    case "speak":
      return <SpeakPreview part={part} course={course} />;
    case "unknown":
      return <UnsupportedPreview />;
  }
}

function UnsupportedPreview() {
  const t = useMessages().lesson;
  return (
    <p className={styles.previewEmpty} role="note">
      {t.unsupportedTitle}
    </p>
  );
}

export interface PartPreviewProps {
  readonly part: Part;
  readonly course: Course;
  readonly library: RichEditorLibrary;
  readonly onLoadAssetPreview: LoadAssetPreview;
}

export function PartPreview({ part, course, library, onLoadAssetPreview }: PartPreviewProps) {
  const messages = useMessages();
  const t = messages.lesson;
  const kind = partKind(part.content);
  return (
    <aside className={styles.previewPane} aria-label={t.previewAria}>
      <div className={styles.previewBody}>
        <PreviewBody
          kind={kind}
          part={part}
          course={course}
          library={library}
          onLoadAssetPreview={onLoadAssetPreview}
        />
      </div>
    </aside>
  );
}
