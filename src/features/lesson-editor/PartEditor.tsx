import { useState, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/react";
import { Button } from "@shared/components/button";
import { Field, TextArea } from "@shared/components/form";
import { Icon } from "@shared/components/icon";
import { PanelHeader } from "@shared/components/panel";
import { RichEditor } from "@shared/components/rich-editor";
import { Select, type SelectOption } from "@shared/components/select";
import { Status } from "@shared/components/status";
import { Tag } from "@shared/components/tag";
import type { LessonPart, PartKind } from "@features/lesson-editor/parts";
import styles from "@features/lesson-editor/LessonEditor.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

function Tabs({ labels }: { readonly labels: readonly string[] }) {
  const [selected, setSelected] = useState(0);
  return (
    <div className={styles.lessonType} role="tablist" aria-label="Part editor modes">
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

const CORRECT_ROLE_ITEMS: readonly SelectOption[] = [
  { value: "correct", label: "Correct" },
  { value: "distractor", label: "Distractor" },
];

const ANSWER_ROLE_ITEMS: readonly SelectOption[] = [
  { value: "answer", label: "Answer" },
  { value: "distractor", label: "Distractor" },
];

interface OptionData {
  readonly index: ReactNode;
  readonly title: string;
  readonly mono?: string;
  readonly detail?: string;
  readonly values: readonly string[];
  readonly roleItems?: readonly SelectOption[];
  readonly role?: string;
  readonly trailing?: ReactNode;
}

function OptionRow({ option }: { readonly option: OptionData }) {
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
      {option.roleItems === undefined ? (
        option.trailing
      ) : (
        <Select
          className={styles.roleSelect}
          aria-label={`Role for ${option.title}`}
          items={option.roleItems}
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
  return (
    <div className={styles.settingRow}>
      <span>
        <span className={styles.settingName}>{name}</span>
        <span className={styles.settingDetail}>{detail}</span>
      </span>
      <Tag variant="accent">On</Tag>
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
      type: "contentRecord",
      attrs: {
        label: "Vocabulary / 猫",
        presentation: "vocabulary-card",
        binding: { kind: "record", recordId: "record_cat" },
      },
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The same content record can provide its image and both audio versions anywhere this lesson needs them.",
        },
      ],
    },
  ],
};

function RichTextEditor() {
  const [document, setDocument] = useState<JSONContent>(RICH_TEXT_SEED);
  return <RichEditor value={document} onChange={setDocument} ariaLabel="Rich text part content" />;
}

const MULTIPLE_CHOICE_OPTIONS: readonly OptionData[] = [
  {
    index: "A",
    title: "Vocabulary / 猫",
    mono: "option_cat",
    values: ["猫", "Cat", "Japanese audio", "English audio", "Image"],
    roleItems: CORRECT_ROLE_ITEMS,
    role: "correct",
  },
  {
    index: "B",
    title: "Vocabulary / 犬",
    mono: "option_dog",
    values: ["犬", "Dog"],
    roleItems: CORRECT_ROLE_ITEMS,
    role: "distractor",
  },
  {
    index: "C",
    title: "Vocabulary / 鳥",
    mono: "option_bird",
    values: ["鳥", "Bird"],
    roleItems: CORRECT_ROLE_ITEMS,
    role: "distractor",
  },
];

const IMAGE_OPTIONS: readonly OptionData[] = [
  {
    index: "A",
    title: "Vocabulary / 猫",
    mono: "option_cat",
    values: ["Image · cat.png", "猫", "Japanese audio"],
    roleItems: CORRECT_ROLE_ITEMS,
    role: "correct",
  },
  {
    index: "B",
    title: "Vocabulary / 犬",
    mono: "option_dog",
    values: ["Image · dog.png", "犬"],
    roleItems: CORRECT_ROLE_ITEMS,
    role: "distractor",
  },
  {
    index: "C",
    title: "Vocabulary / 鳥",
    mono: "option_bird",
    values: ["Image · bird.png", "鳥"],
    roleItems: CORRECT_ROLE_ITEMS,
    role: "distractor",
  },
  {
    index: "D",
    title: "Vocabulary / 魚",
    mono: "option_fish",
    values: ["Image · fish.png", "魚"],
    roleItems: CORRECT_ROLE_ITEMS,
    role: "distractor",
  },
];

const FILL_BLANK_OPTIONS: readonly OptionData[] = [
  {
    index: "A",
    title: "Vocabulary / 猫",
    mono: "option_cat",
    values: ["猫", "Cat"],
    roleItems: ANSWER_ROLE_ITEMS,
    role: "answer",
  },
  {
    index: "B",
    title: "Vocabulary / 犬",
    mono: "option_dog",
    values: ["犬", "Dog"],
    roleItems: ANSWER_ROLE_ITEMS,
    role: "distractor",
  },
  {
    index: "C",
    title: "Vocabulary / 鳥",
    mono: "option_bird",
    values: ["鳥", "Bird"],
    roleItems: ANSWER_ROLE_ITEMS,
    role: "distractor",
  },
];

const LISTEN_WORD_BANK: readonly OptionData[] = [
  ...FILL_BLANK_OPTIONS.slice(0, 3),
  {
    index: "D",
    title: "Vocabulary / 魚",
    mono: "option_fish",
    values: ["魚", "Fish"],
    roleItems: ANSWER_ROLE_ITEMS,
    role: "distractor",
  },
];

const MATCH_PAIRS: readonly { readonly ja: string; readonly en: string }[] = [
  { ja: "猫", en: "Cat" },
  { ja: "犬", en: "Dog" },
  { ja: "鳥", en: "Bird" },
  { ja: "魚", en: "Fish" },
];

function OptionEditor({
  prompt,
  help,
  panelTitle,
  panelDescription,
  options,
  promptLabel = "Prompt",
}: {
  readonly prompt: string;
  readonly help: string;
  readonly panelTitle: string;
  readonly panelDescription: string;
  readonly options: readonly OptionData[];
  readonly promptLabel?: string;
}) {
  return (
    <div className={styles.formGrid}>
      <PromptField label={promptLabel} value={prompt} help={help} />
      <Panel title={panelTitle} description={panelDescription}>
        <div className={styles.optionList}>
          {options.map((option) => (
            <OptionRow key={option.title} option={option} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function MatchEditor() {
  return (
    <div className={styles.formGrid}>
      <PromptField
        label="Prompt"
        value="Match each word to its meaning."
        help="Learners tap a Japanese word, then its English meaning. Pairs are shuffled on each attempt."
      />
      <Panel title="Pairs" description="Each pair links two values from one content record.">
        <div className={styles.pairList}>
          {MATCH_PAIRS.map((pair) => (
            <div key={pair.ja} className={styles.pairRow}>
              <span className={styles.pairSide}>
                <span className={styles.rowTitle}>{pair.ja}</span>
                <span className={joinClassNames(styles.rowDetail, styles.mono)}>
                  Vocabulary · Japanese
                </span>
              </span>
              <span className={styles.pairArrow} aria-hidden="true">
                ↔
              </span>
              <span className={styles.pairSide}>
                <span className={styles.rowTitle}>{pair.en}</span>
                <span className={joinClassNames(styles.rowDetail, styles.mono)}>
                  Vocabulary · English
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className={styles.tokenList}>
          <Button variant="ghost">
            <Icon name="plus" size={18} />
            Add pair
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function FillBlankEditor() {
  return (
    <div className={styles.formGrid}>
      <PromptField
        label="Sentence"
        value="これは {{猫}} です。"
        help="Wrap the answer in {{ }} to make the blank. The word inside references Vocabulary / 猫."
      />
      <PromptField
        label="Translation shown as help"
        value="This is a cat."
        help="Optional. Displayed under the sentence while the learner answers."
      />
      <Panel
        title="Word bank"
        description="The answer plus distractors. Order is shuffled for the learner."
      >
        <div className={styles.optionList}>
          {FILL_BLANK_OPTIONS.map((option) => (
            <OptionRow key={option.mono} option={option} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function WordOrderEditor() {
  return (
    <div className={styles.formGrid}>
      <PromptField
        label="Prompt"
        value={'Build this sentence: "This is a cat."'}
        help="Learners tap the word tiles in the correct order to build the answer."
      />
      <Panel
        title="Answer order"
        description="The correct sequence. Tiles are shuffled for the learner."
      >
        <div className={styles.tokenList}>
          {["これ", "は", "猫", "です"].map((token, index) => (
            <span key={token} className={styles.token}>
              <span className={joinClassNames(styles.orderIndex, styles.mono)}>
                {String(index + 1)}
              </span>
              {token}
            </span>
          ))}
        </div>
      </Panel>
      <Panel
        title="Distractor tiles"
        description="Extra tiles mixed into the bank to raise the challenge."
      >
        <div className={styles.tokenList}>
          <span className={styles.token}>犬</span>
          <span className={styles.token}>か</span>
          <Button variant="ghost">
            <Icon name="plus" size={18} />
            Add tile
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function ListenEditor() {
  return (
    <div className={styles.formGrid}>
      <PromptField
        label="Prompt"
        value="Tap the word you hear."
        help="No text is shown until the learner answers — the audio is the whole question."
      />
      <Panel
        title="Audio"
        description="Upload a recording or pull one from Tatoeba. No device-generated audio."
      >
        <div className={styles.optionList}>
          <OptionRow
            option={{
              index: <Icon name="audio" size={18} />,
              title: "neko-ja.mp3",
              detail: "Uploaded · Vocabulary / 猫",
              values: ["0:01", "audio/mpeg"],
              trailing: <SpeakButton>Play</SpeakButton>,
            }}
          />
        </div>
        <div className={styles.tokenList}>
          <Button variant="ghost">
            <Icon name="plus" size={18} />
            Upload audio
          </Button>
          <Button variant="ghost">
            <Icon name="content" size={18} />
            Get from Tatoeba
          </Button>
        </div>
      </Panel>
      <Field label="Answer mode" help="Tap chooses from a word bank; type checks free text.">
        <Select
          name="answer-mode"
          defaultValue="tap"
          aria-label="Answer mode"
          items={[
            { value: "tap", label: "Tap the word" },
            { value: "type", label: "Type what you hear" },
          ]}
        />
      </Field>
      <Panel title="Word bank" description="The answer plus distractors, shuffled for the learner.">
        <div className={styles.optionList}>
          {LISTEN_WORD_BANK.map((option) => (
            <OptionRow key={option.mono} option={option} />
          ))}
        </div>
      </Panel>
      <div className={styles.settingGroup}>
        <SettingRow name="Slow replay" detail="Offer a 0.5× playback button." />
        <SettingRow name="Allow skip" detail="Let learners skip in a quiet place." />
      </div>
    </div>
  );
}

function SpeakEditor() {
  return (
    <>
      <div className={styles.callout}>
        <Icon name="mic" size={18} />
        <span>
          <strong>Graded in the learner app.</strong>
          <br />
          Speaking needs a microphone and on-device speech recognition, so recording and scoring
          can&rsquo;t run here in Studio. This editor sets what learners say and how strictly
          it&rsquo;s matched.
        </span>
      </div>
      <div className={styles.formGrid}>
        <PromptField
          label="Prompt"
          value="Say this word in Japanese."
          help="Shown above the phrase while the learner speaks."
        />
        <Panel
          title="Phrase to speak"
          description="What the learner should say. The audio is the model pronunciation."
        >
          <div className={styles.optionList}>
            <OptionRow
              option={{
                index: <Icon name="mic" size={18} />,
                title: "Vocabulary / 猫",
                detail: "Target · reads “neko”",
                values: ["猫", "neko", "Model audio · neko-ja.mp3"],
                trailing: <SpeakButton>Play</SpeakButton>,
              }}
            />
          </div>
        </Panel>
        <Field
          label="Match strictness"
          help="How closely on-device recognition must match to pass."
        >
          <Select
            name="strictness"
            defaultValue="standard"
            aria-label="Match strictness"
            items={[
              { value: "lenient", label: "Lenient — accept close attempts" },
              { value: "standard", label: "Standard" },
              { value: "strict", label: "Strict — require accurate pronunciation" },
            ]}
          />
        </Field>
        <div className={styles.settingGroup}>
          <SettingRow name="Show romaji" detail="Display &ldquo;neko&rdquo; under the phrase." />
          <SettingRow name="Allow skip" detail="Let learners without a mic continue." />
        </div>
      </div>
    </>
  );
}

function EditorBody({ kind }: { readonly kind: PartKind }) {
  switch (kind) {
    case "rich-text":
      return <RichTextEditor />;
    case "select-image":
      return (
        <OptionEditor
          prompt="Tap the picture for 猫."
          help="Learners hear the Japanese audio, then choose the matching image. Introduces the word before it is tested."
          panelTitle="Image options"
          panelDescription="Each option shows its content image and word. Exactly one is correct."
          options={IMAGE_OPTIONS}
        />
      );
    case "multiple-choice":
      return (
        <OptionEditor
          prompt="Choose the meaning of 猫."
          help="The prompt references Vocabulary / 猫 / Japanese."
          panelTitle="Answer options"
          panelDescription="Each option keeps a stable ID and may expose several values."
          options={MULTIPLE_CHOICE_OPTIONS}
        />
      );
    case "match-pairs":
      return <MatchEditor />;
    case "fill-blank":
      return <FillBlankEditor />;
    case "word-order":
      return <WordOrderEditor />;
    case "listen":
      return <ListenEditor />;
    case "speak":
      return <SpeakEditor />;
  }
}

export function PartEditor({ part }: { readonly part: LessonPart }) {
  const tabLabels = part.kind === "rich-text" ? ["Write", "References"] : ["Options", "Feedback"];

  return (
    <section className={styles.editorArea} aria-label="Selected lesson part editor">
      <div className={styles.partHeading}>
        <span>
          <span className={styles.partName}>{part.name}</span>
          <span className={styles.rowDetail}>{part.headingDetail}</span>
        </span>
        <Status>Saved</Status>
      </div>
      <Tabs labels={tabLabels} />
      <EditorBody kind={part.kind} />
    </section>
  );
}
