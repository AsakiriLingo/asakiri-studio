# Course versioning and distribution decision record

Status: **Proposed 2026-08-09**. User-decided so far: one Git repo per course, and a
manually maintained registry that authors join by pull request. The manifest `release`
block and the major/minor/patch rules below are proposed pending approval.

This record covers how a published course is versioned, where it lives, and how learners and
the Asakiri site discover it. It does not add publishing or sync features to Studio; tagging,
releases, and the registry are the author's Git workflow plus the website, consistent with
"Git is used outside Studio" ([STORAGE-DECISION.md](STORAGE-DECISION.md)).

## Three version numbers, kept separate

The most important rule: do not conflate these.

| Version                | Lives on                          | Bumps when                          | Consumers                   |
| ---------------------- | --------------------------------- | ----------------------------------- | --------------------------- |
| `formatVersion`        | every persisted file              | the on-disk file **layout** changes | Studio, migrations          |
| course release version | Git tag + `project.json`          | the course **content** changes      | authors, learners, registry |
| app version            | `package.json`, `tauri.conf.json` | Studio ships                        | nobody downstream           |

A course can move `1.0.0` to `5.0.0` while `formatVersion` never moves, and vice versa. This
record is about the middle row.

## The major / minor / patch rule

Learner progress is keyed by the stable IDs the course already uses (unit, lesson, part, record,
field, and item IDs; see [CONTENT-ARCHITECTURE.md](CONTENT-ARCHITECTURE.md)). That gives an
unambiguous line for what "breaking" means:

- **MINOR** (`1.1.0` to `1.2.0`) — additive, all existing IDs stay valid. A learner mid-course
  upgrades and nothing breaks. New lessons or chapters appended, new exercises, new vocabulary
  records, added media, expanded explanations, a corrected answer key.
- **MAJOR** (`1.x` to `2.0.0`) — an existing ID was removed or repurposed, or the outline was
  restructured so a saved position no longer resolves. Renamed or deleted lessons, reordered
  chapters, a removed collection an exercise depended on. The learner app treats a new major as
  a **new edition**: offer restart or migration, never silently drift.
- **PATCH** (`1.2.0` to `1.2.1`) — typos, metadata, a broken media file swapped for a working
  one. No new learning.

The test for major vs minor is one question: _does this invalidate progress keyed by ID?_ If no,
it is at most minor.

### Compatibility contract

- Within one major line, progress is guaranteed resumable across every minor and patch upgrade.
- Across a major boundary, resumption is not guaranteed; the learner app must ask before upgrading.

### Pre-release and prerelease

- `0.x` while a course is still being built; anything may change. `1.0.0` is the first public
  release.
- Previews use a prerelease suffix: `1.2.0-beta.1`.

## Where the version is stored

Add a `release` block to `project.json`, independent of `formatVersion`:

```json
{
  "format": "asakiri-course",
  "formatVersion": "0.1",
  "project": { "id": "course_japanese_starter", "title": "Japanese Starter", "...": "..." },
  "release": { "version": "1.2.0", "releasedAt": "2026-08-09", "channel": "stable" },
  "collections": [],
  "assets": [],
  "lessons": [],
  "outline": []
}
```

Studio's only role in publishing is writing `release.version`. Everything below is the author's
Git workflow.

## Distribution: one Git repo per course

One repository per course, not a monorepo. It matches the `git init` Studio already runs on
create, gives each course its own tags, changelog, license, and access, and avoids tag
namespacing (`course-a/v1.2.0`). A course may live in anyone's GitHub account.

**A release is an annotated Git tag `v1.2.0` plus a GitHub Release.** No build step or bundle is
required: GitHub serves the tag tarball at
`https://github.com/<owner>/<repo>/archive/refs/tags/v1.2.0.tar.gz`, and the record-per-file
layout unpacks straight into a course directory. A packaged `.asakiri` bundle (validated,
optionally signed) can be attached to the Release later; it is not needed for v1.

One CI check per course repo: on tag, assert `project.json`'s `release.version` equals the tag.
This prevents manifest/tag drift.

## Changelog

Every course repo keeps a `CHANGELOG.md` in [Keep a Changelog](https://keepachangelog.com)
format, with a **Breaking** subsection that justifies each major bump in learner terms:

```markdown
## [2.0.0] - 2026-09-01

### Changed (breaking)

- Reordered the outline and renamed lesson IDs. Progress from 1.x does not carry over.

### Added

- Rebuilt chapter 1 around spaced-repetition exercises.

## [1.2.0] - 2026-08-09

### Added

- Chapter 4: particles, 8 lessons.

### Fixed

- Corrected the answer key in "Greetings" exercise 3.
```

The matching GitHub Release notes carry the same section. The Asakiri registry links to (or
copies) those notes so the site can show history.

## The registry

The registry is a catalog of pointers hosted on the Asakiri site, not a copy of course content.
It is maintained by hand: an author opens a pull request adding or updating their course entry.
See the website's [DISTRIBUTION.md](../../asakiri-website/docs/DISTRIBUTION.md) for the entry
schema, the submission flow, and the validator.

## Open follow-ups

- Whether to add `release.version` writing to the Rust `create_course` command, or leave it a
  manual manifest edit until a publish flow exists.
- The `.asakiri` bundle format (only if/when validation or signing is wanted).
- How the learner app performs a cross-major migration when an author provides an ID map.
