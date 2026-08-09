# Content, media, and exercise architecture

## Decision

Asakiri Studio uses a content-first domain model with a context-first authoring workflow.

Reusable knowledge is stored as content records. Media is stored as independent assets. Lessons, rich-media blocks, and exercises compose references to those records and assets. Authors can populate Content first, import a table, or create a reusable record without leaving the lesson or exercise they are editing.

This is database-like behavior over local project data; it does not imply that the canonical project format is a database file.

## Critique of the initial proposal

The initial direction was useful, but several parts were too rigid:

1. Giving every scalar value its own ID over-normalizes ordinary records. Stable item IDs are needed only when a repeated value can be addressed independently.
2. Treating a visible table as one storage unit confuses the authoring view with persistence. A table may be backed by many files, shards, or another versioned representation.
3. Requiring authors to create all content before authoring lessons interrupts flow. Reuse should be available everywhere without forcing navigation.
4. Live references need deletion, detachment, and usage semantics. "Updates everywhere" is unsafe without showing affected usages and preventing silent cascades.
5. Exercise presentation and answer evaluation are different concerns. A choice may render several values while correctness should refer to the choice or an evaluation rule.
6. Query-generated distractors can change unexpectedly as content evolves. They should initially be an authoring aid that materializes explicit options.
7. Global `domain/` and `application/` folders would gradually become horizontal dumping grounds. Shared product contracts belong in focused core modules; workflow behavior remains feature-owned.

## Domain boundaries

### Content

Content represents reusable semantic records organized into collections that can be displayed as tables. A collection has a stable ID and field definitions. A record has a globally unique ID, so references do not also need to carry a table ID.

Examples of fields include Japanese text, English text, alternate answers, pronunciation recordings, images, tags, difficulty, and notes.

### Media

Media represents local binary assets and technical metadata. An asset has a stable ID, media kind, local storage identity, MIME type, and derived information such as duration or dimensions.

Semantic roles belong to content. "Japanese pronunciation by speaker A" is the meaning of a content field item; the referenced audio asset owns the file and its technical properties.

### Composition

Lessons and exercises contain renderable fragments. Each fragment binds to reusable content, a media asset, or an intentional inline literal.

```ts
type Binding =
  | { kind: "record"; recordId: string }
  | { kind: "field"; recordId: string; fieldId: string }
  | { kind: "item"; recordId: string; fieldId: string; itemId: string }
  | { kind: "asset"; assetId: string }
  | { kind: "literal"; value: PortableValue };
```

Scalar fields do not need value IDs. Repeated field items receive stable item IDs because an author may reference one pronunciation, image, translation, or example independently.

`PortableValue` is limited to validated JSON-compatible text and structured values. Binary data and absolute paths never appear inline.

## Example record shape

The following illustrates domain semantics, not the final disk schema:

```json
{
  "id": "record_cat",
  "collectionId": "vocabulary",
  "fields": {
    "japanese": {
      "kind": "text",
      "value": "猫"
    },
    "english": {
      "kind": "text",
      "value": "cat"
    },
    "pronunciations": {
      "kind": "list",
      "items": [
        {
          "id": "pronunciation_primary",
          "label": "Japanese — speaker A",
          "assetId": "asset_cat_ja_audio"
        },
        {
          "id": "pronunciation_english",
          "label": "English — speaker B",
          "assetId": "asset_cat_en_audio"
        }
      ]
    },
    "images": {
      "kind": "list",
      "items": [
        {
          "id": "image_primary",
          "assetId": "asset_cat_image"
        }
      ]
    }
  }
}
```

Field IDs and item IDs are stable and independent from their visible labels. Renaming a column or item does not break references.

## Modeling writing systems

Alphabets and characters are content, not a separate entity. A character is a reusable record with text and asset fields, so a writing system is a collection like any other. A dedicated character entity would fragment the model and duplicate what collections already provide.

A character record typically carries the glyph, a romanization, pronunciation audio, and stroke-order media:

```jsonc
// collection_hiragana field definitions (abbreviated)
{
  "id": "collection_hiragana",
  "name": "Hiragana",
  "fields": [
    { "id": "field_char", "kind": "text", "cardinality": "one", "required": true }, // は
    { "id": "field_romaji", "kind": "text", "cardinality": "one", "required": true }, // ha
    { "id": "field_row", "kind": "text", "cardinality": "one" }, // h
    { "id": "field_vowel", "kind": "text", "cardinality": "one" }, // a
    { "id": "field_audio", "kind": "asset", "assetKind": "audio", "cardinality": "one" },
    { "id": "field_stroke", "kind": "asset", "assetKind": "image", "cardinality": "one" },
  ],
}
```

Character records are bound from lessons and exercises exactly like vocabulary. The existing exercise types already cover alphabet drills: `select-image` or `listening` for recognition, `match-pairs` for character to romaji, `word-order` for building kana from a bank. Reuse also composes: a vocabulary record may bind the characters it contains, so a lesson can point out which known characters make up a new word.

Three concerns are specific to writing systems, and all are expressible today:

- **Order.** Canonical order (gojūon, alphabetical) is meaningful, unlike arbitrary vocabulary order. The collection's ordered record list captures it.
- **Grid and grouping.** A syllabary is a grid of consonant rows and vowel columns. Fields such as row and vowel let a view reconstruct the grid without a bespoke structure.
- **Relations.** Variants and derived forms (が from か, uppercase and lowercase, Arabic positional forms) are record-to-record links expressed with a `record` binding, for example a `field_base` pointing at the base character.

Prefer one collection per writing system (hiragana, katakana, kanji, and so on), because field shapes differ across scripts: kanji needs readings and meanings that kana does not. This is an authoring choice, not a requirement.

Anything that feels special about an alphabet, a gojūon grid, a stroke-order player, an on-screen keyboard, is presentation in the learner application or a lesson and exercise type. The characters remain ordinary records, and the specialized views query the collection.

## Course structure

A course is organized as units, lessons, and parts:

- A **unit** groups lessons. Units form the course outline; each names an ordered list of lesson IDs.
- A **lesson** is an ordered list of **parts**. It is a heading learners move through and holds no content of its own.
- A **part** is the unit of content. Each part is one of: a rich-text document (Tiptap), a rich-media composition, or an exercise (one of the exercise types below).

The content kinds (rich-text, rich-media, exercise) classify a _part_, not a lesson. A single lesson typically mixes parts, for example a rich-text introduction followed by several exercises.

## Exercises

Exercise presentation and answer evaluation are different concerns, and different exercise types must not be forced into one universal answer object. Every exercise separates two things:

- **Presentation**: the fragments a learner sees and the pieces they manipulate (prompt, options, tokens, pairs, blanks). These are compositions of bindings, the same as any lesson content.
- **Evaluation**: how a response is graded. Correctness always refers to stable IDs or to accepted-value bindings, never to duplicated display values.

The stable core is the small set of evaluation strategies. An exercise `type` is an authoring and interaction template layered on top, and several types can share one strategy (for example both `multiple-choice` and `select-image` grade with `selected-options`).

### Shared shape

Every exercise carries a common envelope plus one type-specific body.

```ts
type ExerciseType =
  | "multiple-choice"
  | "select-image"
  | "match-pairs"
  | "fill-blank"
  | "word-order"
  | "listening"
  | "speaking";

interface RenderFragment {
  readonly id: string;
  readonly role: string; // "primary", "supporting-text", "visual", "audio", "translation", ...
  readonly binding: Binding; // see Composition
}

interface ChoiceOption {
  readonly id: string;
  readonly body: readonly RenderFragment[];
}

interface AcceptedValue {
  readonly binding: Binding; // usually a field such as field_alternate_answers
}

interface ExerciseBase {
  readonly id: string;
  readonly type: ExerciseType;
  readonly instruction?: string;
  readonly prompt: readonly RenderFragment[];
  readonly evaluation: Evaluation;
  readonly feedback?: ExerciseFeedback; // optional: correct / incorrect / per-option
  readonly settings?: ExerciseSettings; // optional per-type toggles
  readonly presentation?: { readonly layout?: "list" | "image-grid" };
}
```

`ChoiceOption` is reused wherever an exercise offers addressable pieces: options, pair items, and tokens. Accepted values are wrapped so their `binding` is validated like any other binding.

### Evaluation strategies

```ts
interface NormalizationRules {
  readonly ignoreCase?: boolean;
  readonly ignoreWhitespace?: boolean;
  readonly ignorePunctuation?: boolean;
  readonly ignoreScript?: boolean; // e.g. accept kana for kanji
}

interface BlankAnswer {
  readonly blankId: string;
  readonly correctOptionIds?: readonly string[]; // when filled from a bank
  readonly accepted?: {
    // when typed
    readonly values: readonly AcceptedValue[];
    readonly normalize?: NormalizationRules;
  };
}

type Evaluation =
  | { kind: "selected-options"; select?: "one" | "many"; correctOptionIds: readonly string[] }
  | { kind: "ordered-tokens"; correctOrder: readonly string[] } // token IDs in order
  | { kind: "matched-pairs"; pairs: readonly { leftId: string; rightId: string }[] }
  | { kind: "filled-blanks"; blanks: readonly BlankAnswer[] }
  | { kind: "typed-answer"; accepted: readonly AcceptedValue[]; normalize?: NormalizationRules }
  | { kind: "spoken-response"; strictness: "lenient" | "standard" | "strict" };
```

Accepted-value bindings usually point at a record field such as `field_alternate_answers`, so "a cat" and "cats" both pass without duplicating text in the exercise.

### Exercise types

| Type              | Learner does                            | Evaluation                           | Auto-graded in Studio |
| ----------------- | --------------------------------------- | ------------------------------------ | --------------------- |
| `multiple-choice` | picks one or more options               | `selected-options`                   | yes                   |
| `select-image`    | hears audio, taps the matching image    | `selected-options`                   | yes                   |
| `match-pairs`     | links each item to its partner          | `matched-pairs`                      | yes                   |
| `fill-blank`      | fills blank(s) from a bank or by typing | `filled-blanks`                      | yes                   |
| `word-order`      | orders tokens into a sentence           | `ordered-tokens`                     | yes                   |
| `listening`       | hears audio, then taps or types         | `selected-options` or `typed-answer` | yes                   |
| `speaking`        | says the phrase aloud                   | `spoken-response`                    | no, learner app only  |

```ts
interface MultipleChoiceExercise extends ExerciseBase {
  readonly type: "multiple-choice" | "select-image";
  readonly options: readonly ChoiceOption[];
  readonly evaluation: Extract<Evaluation, { kind: "selected-options" }>;
}

interface MatchPairsExercise extends ExerciseBase {
  readonly type: "match-pairs";
  readonly left: readonly ChoiceOption[];
  readonly right: readonly ChoiceOption[]; // extra right items are distractors
  readonly evaluation: Extract<Evaluation, { kind: "matched-pairs" }>;
}

type BlankSegment =
  | { readonly kind: "text"; readonly fragment: RenderFragment }
  | { readonly kind: "blank"; readonly id: string };

interface FillBlankExercise extends ExerciseBase {
  readonly type: "fill-blank";
  readonly stem: readonly BlankSegment[]; // the sentence with one or more blanks
  readonly bank?: readonly ChoiceOption[]; // present in tap-to-fill mode
  readonly translation?: RenderFragment; // optional helper
  readonly evaluation: Extract<Evaluation, { kind: "filled-blanks" }>;
}

interface WordOrderExercise extends ExerciseBase {
  readonly type: "word-order";
  readonly tokens: readonly ChoiceOption[]; // answer tokens
  readonly distractors?: readonly ChoiceOption[]; // extra tokens that must stay unused
  readonly evaluation: Extract<Evaluation, { kind: "ordered-tokens" }>;
}

interface ListeningExercise extends ExerciseBase {
  readonly type: "listening";
  readonly stimulus: RenderFragment; // the audio; it is the whole question
  readonly answerMode: "select" | "type";
  readonly options?: readonly ChoiceOption[]; // present when answerMode is "select"
  readonly evaluation:
    | Extract<Evaluation, { kind: "selected-options" }>
    | Extract<Evaluation, { kind: "typed-answer" }>;
}

interface SpeakingExercise extends ExerciseBase {
  readonly type: "speaking";
  readonly target: RenderFragment; // the phrase to say (word, reading, model audio)
  readonly evaluation: Extract<Evaluation, { kind: "spoken-response" }>;
}

interface ExerciseSettings {
  readonly slowReplay?: boolean; // listening
  readonly allowSkip?: boolean; // listening, speaking
  readonly showRomaji?: boolean; // speaking
}

interface ExerciseFeedback {
  readonly correct?: readonly RenderFragment[];
  readonly incorrect?: readonly RenderFragment[];
  readonly perOption?: Readonly<Record<string, readonly RenderFragment[]>>;
}
```

An option can render Japanese text, English text, audio, an image, or several together. Correctness refers to the stable IDs the exercise already defines (option, token, pair, and blank IDs), so renaming a displayed value never changes grading.

### Grading location

Auto-gradable types resolve entirely from authored IDs, ordering, pairs, or normalized text, so Studio can preview and grade them. `speaking` is different: it needs a microphone and on-device speech recognition, so recording and scoring run only in the learner application. Studio authors the target phrase and strictness and marks the type as graded on device; it does not record or score, and nothing is uploaded.

### Notes

- `select-image` is mechanically `multiple-choice` with image-valued option bodies and an audio prompt fragment. It is a distinct authoring template sharing the `selected-options` strategy, with `presentation.layout` set to `image-grid`.
- Distractors stay explicit for every type: options, unpaired right items, and unused tokens. Distractor queries remain editor tooling: the author selects a pool, Studio proposes candidates, and the chosen distractors are stored explicitly. Runtime-generated distractors can be added later if the learner format gains deterministic generation rules.
- Typed grading (typed `listening`, typed `fill-blank`) uses accepted-value bindings plus `NormalizationRules` for case, whitespace, script, or punctuation, rather than duplicating text.
- The existing `japanese-starter` fixture uses `multiple-choice` and remains valid unchanged.

## Reference lifecycle

- References are live by default.
- Every content record, field, item, and asset has a derived usage list.
- Referenced entities cannot be silently deleted. The user must replace references, detach usages, or explicitly leave them broken.
- Detaching text or structured content creates an intentional literal snapshot in the lesson or exercise.
- Detaching presentation from a content record does not duplicate binary media; media remains referenced by asset ID unless the author imports a distinct file.
- A validation pass reports missing records, fields, repeated items, and assets whenever a project opens and before course sharing/export is later introduced.

The usage graph is derived from project content and may be cached. It is not an independently editable source of truth.

## Authoring workflow

All three entry paths produce the same reusable records:

1. Create or import records in the Content area.
2. From a lesson, choose existing content or create a new record inline and insert its binding.
3. From an exercise, choose records for prompts and options, or create missing records without leaving the exercise.

Media can likewise be uploaded in the Media area or from any field that accepts an asset. Uploading from a content field creates the media asset first and then binds the field item to its asset ID.

## Deferred decisions

The following remain intentionally undecided until realistic course fixtures are available:

- canonical JSON file boundaries and directory layout;
- collection sharding for very large content sets;
- schema-template format and custom-field constraints;
- whether record changes require revision history beyond Git;
- query-based runtime exercise generation;
- packaging rules for the separate learner application.

These choices must remain behind repository and resolver ports so they do not leak into feature components or Tiptap documents.

## Working fixture

[`examples/courses/japanese-starter`](../examples/courses/japanese-starter) exercises these ideas with reusable vocabulary, local image media, audio placeholders, a Tiptap document, a rich-media composition, a detached literal, and an exercise. It is intentionally labeled as a draft fixture rather than a canonical storage format. Its manifest declares collections, assets, and lessons explicitly; collections declare their record files. `pnpm check:example` validates its schema and references.
