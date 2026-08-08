# Japanese Starter example course

This directory is a working data fixture for architecture discussions. It is not the final Asakiri project format.

The fixture demonstrates:

- a small project manifest rather than one complete `course.json`;
- a reusable Vocabulary collection with one record per example item;
- a Hiragana collection modeling a writing system as ordinary records (character, romaji, row, vowel, audio);
- scalar fields and independently referenceable repeated media items;
- media assets stored separately from semantic content;
- a normal Tiptap rich-text lesson;
- a rich-media lesson referencing the same Cat record and its individual media;
- an explicit literal binding representing content detached from a live record;
- one lesson for every exercise type, each composing content bindings:
  - `multiple-choice` (Choose the matching word);
  - `select-image` (audio prompt, image options across Cat, Dog, Bird);
  - `match-pairs` (hiragana characters to romaji);
  - `fill-blank` (a templated sentence with a word bank);
  - `word-order` (ordered tokens plus distractors, reusing both collections);
  - `listening` in type mode (`typed-answer` against the Cat alternate answers);
  - `speaking` (`spoken-response`, graded on device, not in Studio);
- answer evaluation based on stable IDs and accepted-value bindings rather than duplicated values.

The Cat image is a real local SVG. Japanese and English audio entries are marked `placeholder` with an expected filename, so the fixture can model missing-media behavior without checking in fake audio. Assets marked `ready` must have a real local file; `pnpm check:example` enforces this.

IDs are deliberately independent from visible labels and filenames. The table-like collection is an authoring view; this folder layout is only one candidate persistence representation.

The draft manifest explicitly lists collections, assets, and lessons. Collections then list their record files. This lets the validator follow declared data rather than guessing from filenames and supports records nested into future shards.
