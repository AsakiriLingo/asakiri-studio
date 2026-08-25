# Asakiri course format v1

Status: **canonical as of 2026-08-25.** `format: "asakiri-course"`, current `formatVersion: 2`.

A course is one directory. Every file in it is JSON, every file carries the format envelope,
and every entity carries a stable ID. Machine-readable schemas live in
[`schemas/asakiri-course/v1`](../schemas/asakiri-course/v1) and are validated against the
[`japanese-starter`](../examples/courses/japanese-starter) fixture by `pnpm check:schemas`.

## Directory layout

```text
project.json                          manifest: project metadata, outline, file lists
content/collections/<collection>.json field definitions + record file list
content/records/<record>.json         one record per file
media/assets/<asset>/asset.json       asset metadata
media/assets/<asset>/<binary>         the media file itself
lessons/<lesson>/lesson.json          lesson metadata + ordered parts
lessons/<lesson>/parts/<part>/...     one file per part body
```

Records are sharded one per file so a single edit produces a small diff, a torn write risks
one record rather than a collection, and large courses stay workable. Paths are an
implementation detail: everything references everything else by ID, never by path.

## The envelope

Every persisted file begins with:

```json
{
  "format": "asakiri-course",
  "formatVersion": 1
}
```

`formatVersion` is a monotonic integer, bumped only for a breaking change. Additive changes
do not bump it, because readers ignore keys they do not recognize. A file copied out of one
course into another carries its own version, so migrations run per file.

A file whose `formatVersion` is higher than the reading build supports is refused with a
`CourseFormatError` naming both versions, rather than a generic parse failure.

## Migrations

`src/core/course/migrations.ts` holds an ordered list of steps keyed by the version they
produce. Reading a file applies every step above its current version, in memory. The upgraded
shape is written back the next time that file is saved, so opening a course never rewrites it.

Version 0 means "no envelope", which covers both pre-1.0 draft fixtures
(`format: "asakiri-example"`) and files written before versioning existed. The v1 step stamps
the envelope and changes nothing else. The v2 step folds the removed `select-image` exercise
type into `multiple-choice`, which it always was mechanically (image-valued option bodies plus
`presentation.layout: "image-grid"`); it touches nothing else.

## Unknown content is preserved, not rejected

A part whose content kind, exercise type, or composition block type is unrecognized does not
fail the course. It parses into:

```ts
{ kind: "unknown", declaredKind: string, declaredType: string | null, raw: unknown }
```

The lesson still opens, the part keeps its place in the order, the editor shows a
non-editable placeholder, and the body file is left untouched on save. This is what lets an
older Studio open a course authored by a newer one without destroying data.

A _known_ type with a malformed payload still fails loudly. Tolerance covers new vocabulary,
not corruption.

## Localized authored text

Any authored string may be either a plain string in the course's `defaultLocale` or a map of
locale tag to string:

```json
"title": "Practice 猫"

"title": { "en": "Practice 猫", "ja": "猫の練習" }
```

This applies to the project title, subtitle, and description; unit titles; lesson, part, and
part-content titles; exercise instructions; and the `text` of a literal text fragment. Taught
content itself is not localized this way: it lives in content records, where a language is a
field and list items already carry a `locale`.

Studio resolves each value to the course's `defaultLocale` when reading, so the domain model
and every screen still work with plain strings. Resolution falls back from an exact tag to the
base language (`pt-BR` to `pt`) and then to any available entry.

Writes preserve what they do not display: saving a title that exists on disk as a locale map
updates only the active locale's entry and leaves the others untouched. A single-language
course stays plain strings and never grows a map it did not ask for.

Studio has no UI for authoring a second locale yet. Translations round-trip safely, so they
can be added by hand or by external tooling in the meantime.

## Identity and ordering

Every course, collection, record, field, list item, asset, lesson, part, exercise, option,
token, pair, and blank has an `id`. Ordering is expressed separately, as arrays of IDs
(`outline[].lessonIds`, `lesson.parts[]`). Reordering a course therefore rewrites order
arrays and never touches identity, so learner progress keyed on IDs survives any
rearrangement an author makes.

## Media integrity

`asset.json` records `sha256` and `byteSize` for any asset with a local file. Studio computes
both after the binary lands in the project, which matters for images because EXIF stripping
changes the bytes. The digest gives integrity checking, deduplication, and a cache key for
players. `pnpm check:example` verifies the fixture's digests against the actual files.

## Extending the format

- Adding an optional key to an existing file type: no version bump.
- Adding a new exercise type, block type, or part kind: no version bump. Older builds preserve
  it as unknown content.
- Renaming or removing a key, or changing the meaning of an existing one: bump `formatVersion`
  and add a migration step.

Third parties building validators, editors, or players should read the JSON Schemas rather
than reimplementing `parse-course.ts`. The schemas are the contract; the parser is one
implementation of it.
