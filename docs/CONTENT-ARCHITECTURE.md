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

## Exercises

Exercise prompts and options are compositions. Evaluation remains separate:

```ts
interface ChoiceOption {
  readonly id: string;
  readonly body: readonly RenderFragment[];
}

interface MultipleChoiceExercise {
  readonly prompt: readonly RenderFragment[];
  readonly options: readonly ChoiceOption[];
  readonly evaluation: {
    readonly kind: "selected-options";
    readonly correctOptionIds: readonly string[];
  };
}
```

An option can render Japanese text, English text, audio, an image, or several of them together. Correctness refers to stable option IDs rather than duplicating the displayed values.

Typed-answer exercises use a separate evaluation strategy with accepted-value bindings and comparison rules such as case, whitespace, script, or punctuation normalization. Different exercise types should not be forced into one universal answer object.

Distractor queries are initially editor tooling: the author selects a pool, Studio proposes candidates, and the chosen distractors are stored explicitly. Runtime-generated distractors can be added later if the learner format gains deterministic generation rules.

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
