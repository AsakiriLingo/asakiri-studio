import type { ReactNode } from "react";
import type { JSONContent } from "@tiptap/react";
import type { Course, Part } from "@core/course";
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

function MultipleChoicePreview() {
  return (
    <>
      <p className={styles.muted}>Multiple choice</p>
      <h2>Choose the meaning of 猫.</h2>
      <button className={joinClassNames(styles.previewOption, styles.selected)} type="button">
        Cat
      </button>
      <button className={styles.previewOption} type="button">
        Dog
      </button>
      <button className={styles.previewOption} type="button">
        Bird
      </button>
    </>
  );
}

const IMAGE_CHOICES: readonly {
  readonly file: string;
  readonly label: string;
  readonly sub: string;
}[] = [
  { file: "cat.png", label: "猫", sub: "neko" },
  { file: "dog.png", label: "犬", sub: "inu" },
  { file: "bird.png", label: "鳥", sub: "tori" },
  { file: "fish.png", label: "魚", sub: "sakana" },
];

function SelectImagePreview() {
  return (
    <>
      <p className={styles.muted}>New words</p>
      <h2>Which one is 猫?</h2>
      <button className={styles.speakButton} type="button">
        <Icon name="audio" size={18} />
        ねこ
      </button>
      <div className={styles.imageChoiceGrid}>
        {IMAGE_CHOICES.map((choice, index) => (
          <button
            key={choice.file}
            className={joinClassNames(
              styles.imageChoice,
              index === 0 ? styles.selected : undefined,
            )}
            type="button"
          >
            <span className={styles.imageThumb}>
              <Icon name="image" size={18} />
              <span className={styles.file}>{choice.file}</span>
            </span>
            <span className={styles.imageChoiceLabel}>{choice.label}</span>
            <span className={styles.imageChoiceSub}>{choice.sub}</span>
          </button>
        ))}
      </div>
      <p className={styles.exerciseHint}>
        The word under each image teaches its reading while the learner picks.
      </p>
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

function FillBlankPreview() {
  return (
    <>
      <p className={styles.muted}>Fill in the blank</p>
      <h2>Complete the sentence</h2>
      <p className={styles.clozeSentence}>
        これは <span className={joinClassNames(styles.blank, styles.filled)}>猫</span> です。
      </p>
      <p className={styles.muted}>This is a cat.</p>
      <div className={styles.wordBank}>
        <span className={styles.wordBankLabel}>Word bank</span>
        <button className={joinClassNames(styles.wordChip, styles.used)} type="button">
          猫
        </button>
        <button className={styles.wordChip} type="button">
          犬
        </button>
        <button className={styles.wordChip} type="button">
          鳥
        </button>
      </div>
      <p className={styles.exerciseHint}>
        猫 has been placed in the blank; tap it again to return it to the bank.
      </p>
    </>
  );
}

function WordOrderPreview() {
  return (
    <>
      <p className={styles.muted}>Build the sentence</p>
      <h2>This is a cat.</h2>
      <div className={styles.sentenceBuild}>
        <div className={styles.answerTrack}>
          <span className={styles.token}>これ</span>
          <span className={styles.token}>は</span>
          <span className={styles.token}>猫</span>
        </div>
        <div className={styles.wordBank}>
          {["これ", "は", "猫"].map((token) => (
            <button
              key={token}
              className={joinClassNames(styles.wordChip, styles.used)}
              type="button"
            >
              {token}
            </button>
          ))}
          {["です", "犬", "か"].map((token) => (
            <button key={token} className={styles.wordChip} type="button">
              {token}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.exerciseHint}>
        Three tiles placed, one to go. Used tiles are greyed in the bank.
      </p>
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
      return <SelectImagePreview />;
    case "multiple-choice":
      return <MultipleChoicePreview />;
    case "match-pairs":
      return <MatchPreview />;
    case "fill-blank":
      return <FillBlankPreview />;
    case "word-order":
      return <WordOrderPreview />;
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
