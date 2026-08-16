# Storage layout decision record

Status: **Superseded 2026-08-16.** The layout chosen here is now canonical and specified in [COURSE-FORMAT.md](COURSE-FORMAT.md). This record is kept for the reasoning behind the choice.

This record compares JSON file-boundary options for an Asakiri course project. Option A was
adopted and is now the canonical layout, stamped `"format": "asakiri-course"`,
`"formatVersion": 1`.

## Context

- One course is one project directory (local-first; Git is used outside Studio).
- The domain has distinct concepts: a manifest, content collections (field definitions), content
  records, media assets (metadata + binary), lessons, exercises, and compositions.
- References between concepts use stable IDs, not paths in records.
- Records are the highest-churn, most numerous, and independently-addressable data. **The file
  boundary that matters most is the record boundary**, so the options below are framed around it.
- Two boundaries are effectively forced and not in contention:
  - **Media assets** must store a binary file, so each asset is a folder (`asset.json` + the
    binary) in every option.
  - **Lesson rich-text** (Tiptap) documents are large and edited independently of lesson
    metadata, so the document is its own file in every option.

## Rejected up front: a single `course.json`

A single file holding the whole course is rejected by the roadmap and by every dimension below:
every edit rewrites the entire course (catastrophic diffs and merge conflicts), the whole course
must be parsed to read anything, a torn write can destroy the entire course, and one syntax error
makes the whole project unopenable. Not considered further.

## Option A — record-per-file (the current fixture)

```
project.json                         # manifest: lists collection/asset/lesson files + outline
content/collections/vocabulary.json  # field definitions + list of record files
content/records/cat.json             # one record
content/records/dog.json             # one record
media/assets/cat-image/asset.json    # asset metadata + original.svg binary
lessons/welcome/lesson.json          # lesson metadata
lessons/welcome/document.json        # Tiptap document
```

Each record is its own file. The collection file owns field definitions and references its records.

## Option B — records embedded in the collection file

```
project.json                         # manifest
content/collections/vocabulary.json  # field definitions AND every record inline
media/assets/cat-image/asset.json    # (same as A)
lessons/welcome/lesson.json          # (same as A)
lessons/welcome/document.json        # (same as A)
```

One file per collection holds the field definitions and all of that collection's records.

## Comparison

| Dimension           | Option A — record-per-file                                                                 | Option B — records embedded                                                         |
| ------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| **Diff quality**    | Editing one record changes one small file — clean, reviewable Git diffs, minimal conflicts | Editing one record rewrites the whole collection file — noisy diffs, more conflicts |
| **Large courses**   | Scales; records load/parse/write individually; sharding is already the default             | A collection of thousands of records is one huge file to parse and rewrite per edit |
| **Partial writes**  | Atomic temp-file + rename per record; a torn write risks at most one record                | Rewriting a large file risks the entire collection on a torn write                  |
| **Validation**      | Damage localizes to one record; the rest of the collection still loads and validates       | One malformed collection file takes out all of its records at once                  |
| **Migration**       | More files touched, but each migration is small, isolated, and can run incrementally       | Fewer files, but each migration rewrites large files wholesale                      |
| **Directory shape** | More files on disk; needs a manifest/index to enumerate                                    | Fewer files; simpler to browse by hand                                              |

Option B wins only on "fewer files on disk." Option A wins on every dimension that matters for a
local-first, Git-tracked, potentially-large, crash-safe editor.

## Decision (proposed)

Adopt **Option A — record-per-file with a manifest** as the provisional canonical layout:

- `project.json` is the manifest (project metadata, outline, and references to collection, asset,
  and lesson files).
- Content: `content/collections/<collection>.json` (field definitions + record-file references);
  `content/records/<record>.json` (one record each).
- Media: `media/assets/<asset>/` containing `asset.json` and the binary.
- Lessons: `lessons/<lesson>/` containing `lesson.json` plus its document / exercise / composition
  files.
- Every persisted file carries a `formatVersion` for the migration envelope (roadmap 5.4).

This is the shape the example fixture already uses, which lets us validate it against realistic data
immediately. The fixture keeps its `asakiri-example` / `0.1-draft` markers for now; promoting them to
a real `format` id and version happens when the repository adapter implements this layout (roadmap
5.2), so the example validator stays stable until then.

## Consequences

- Writes are per-file and atomic (temp + rename), satisfying the durability goals of roadmap 5.x.
- "Collection sharding for very large content sets" (a deferred item) is already satisfied, since
  records are sharded by default.
- **UI components stay independent of this choice.** Features read through the `ProjectReader` port
  (`ContentCollectionSummary`, etc.); no component knows file paths or JSON boundaries. Swapping or
  evolving this layout is a repository-adapter concern (roadmap 5.2/5.3), not a UI change.
- The layout is provisional and may still be revised before real course data exists; it is pinned
  behind the repository port so revisions do not leak into features.

## Open follow-ups (not part of this record)

- Exact `formatVersion` scheme and the no-op migration contract (roadmap 5.4).
- Whether the manifest lists files explicitly or a directory scan discovers them (affects rename
  handling).
- Per-record vs per-collection index caching for the read port.
