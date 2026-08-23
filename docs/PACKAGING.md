# Course packaging and distribution

Status: **proposal, not yet implemented.** This describes how a folder course becomes
distributable artifacts and how a learner application consumes them. Nothing here changes the
canonical on-disk format in [COURSE-FORMAT.md](COURSE-FORMAT.md); packaging is a derived,
one-way export of it.

## Scope and boundary

Studio is authoring-only. It opens and edits the **folder course** and nothing else. Packaging
is one-way and entirely local: Studio keeps the finished files current in a `release/` directory
inside the course folder as the author works. It makes no network calls, runs no git operations,
and never reads a package back. `release/` is a reserved directory: Studio writes it and ignores
it when loading the course, so it never appears as course content.

This stretches the "no publishing" line in [AGENTS.md](../AGENTS.md). The intended reading is
that local export to disk is in scope, while uploading, git integration, and any cloud or
registry call stay out of Studio and are performed by the author in the browser or by separate
tooling. Adopting this doc means updating that line in `AGENTS.md` deliberately.

## Goals

- Frequent, tiny updates to course data without re-transferring media.
- Bounded artifact sizes at the scale of 10,000+ assets.
- Exact deduplication of assets within and across course versions.
- A recurring author workflow of "commit or upload the `release/` folder," with Studio keeping it
  current automatically so there is no separate export step.
- Integrity by construction, reusing the digests the format already stores.

## Non-goals

- No CLI in the author path.
- No git anywhere in the course workflow. Authoring, packaging, and hosting must all work with no
  git and no GitHub. The folder on disk is the sole editable source of truth. Studio contains no
  git integration at all: it does not initialize a repository, does not read git status, and never
  runs git. If an author wants version control, they set it up themselves outside Studio.
- No package ingestion by Studio. Packaging is one-way, so a package cannot be turned back into
  an editable folder. The author is responsible for keeping their own backups of the folder;
  there is no recovery utility.

## Why not a single archive

Media is already compressed, so re-archiving the whole course barely shrinks it. Worse, one
opaque archive means any edit shifts its bytes and forces the whole thing to move again. A single
monolithic asset pack also breaks at scale: 10,000 assets can be many gigabytes and cannot be
regenerated cheaply on every edit. Distribution must separate the small, frequently changing data
from the large, rarely changing binaries, and it must shard the binaries.

## Two channels

```
course folder/                        the source of truth you edit
  project.json, content/, lessons/, media/
  release/                            Studio keeps this current automatically
    manifest.json  ·  .akc  ·  .akp   commit or upload this, a host serves it, a learner app reads it
```

1. **Course data** is all the JSON: `project.json`, collections, records, lessons, parts, and
   every `media/assets/<id>/asset.json` (which carries the asset's sha256). Small, text, diffs
   well, changes often. Shipped as one `.akc` bundle.
2. **Asset binaries** are the media files, pulled out of the folder and stored by content hash.
   Large, rarely changing. Shipped as per-unit `.akp` packs.

## Hosting is the author's choice

Studio always keeps the same files in `release/` (`manifest.json`, the `.akc`, and `.akp` packs).
Where those files are served from is entirely up to the author, and it never involves git as a
requirement. The general model on any host is: put `release/` somewhere that serves files
over HTTP, and on each update send only the files that changed. Pack files are immutable once
written (a changed unit produces a new pack file rather than overwriting one), so only
`manifest.json` is ever replaced. That keeps CDN caching simple: packs cache forever, and the
small, mutable manifest is served fresh.

Common ways to host `release/`:

- **A git host (GitHub, GitLab, and so on).** Commit `release/`, using LFS for the large `.akp`
  files, and push. The registry reads files from the repository tree (the raw URL of
  `release/manifest.json` on the default branch), never the Releases-tag feature. Committing the
  whole course folder or only `release/` is the author's choice; Studio does not prescribe a
  `.gitignore` and does not care about the duplicated bytes.
- **Any static host, object store, or CDN.** Upload the contents of `release/` to one location.
- **A backend or paid course platform that wants a single file.** Zip the `release/` folder
  yourself and upload it; the backend unpacks and serves it. Studio does not produce the zip; the
  export is always the loose `release/` folder.

To stay host-agnostic the manifest references files by relative name, resolved against wherever
the manifest is served. A host that cannot serve every file from one location may instead carry an
absolute `url` per file. Export is identical either way; only the manifest's URL fields and the
upload gesture differ.

## Content addressing

Every `asset.json` already records `sha256` and `byteSize` (see
[COURSE-FORMAT.md](COURSE-FORMAT.md), Media integrity). Packaging treats the sha256 as the blob
identity. Placement of a blob into a pack is only a heuristic; correctness always resolves
through the manifest's sha256 index, never through which pack a blob happens to sit in. This is
what makes cross-unit reuse free of duplication.

## Artifacts and extensions

Files inside `release/`, handled by hosts and the learner app, never by the author directly:

- **`.akc`** Asakiri Course. The JSON data bundle.
- **`.akp`** Asakiri Pack. A per-unit asset pack, fetched over HTTP by hash.
- **`manifest.json`** The index and entry point. Plain JSON so the learner app and registry can
  parse it directly.

The single-file export, for sideloading:

- **`.asakiri`** A whole course in one file: a zip of the entire `release/` folder
  (`manifest.json`, the `.akc`, and every `.akp`). Produced by **File > Export**, it opens in the
  learner app so a course can be sideloaded without any host. Because `release/` uses a relative
  manifest, a `.asakiri` is self-contained and resolves offline.

`.akc` and `.akp` are zip-structured internally, but the branded extensions are opaque on purpose:
a file manager will not offer to unzip them, and they read as first-class Asakiri artifacts. This
is cosmetic and about branding, not security; renaming to `.zip` still works.

Wire types:

- `.akc` is `application/vnd.asakiri.course`
- `.akp` is `application/vnd.asakiri.pack`
- `.asakiri` is `application/vnd.asakiri.course-package`

File associations:

- `.asakiri` associates with the **learner app** (open a course to learn, or sideload one).
- `.akc`, `.akp`, and `manifest.json` are internal to a release and have no user-facing open
  behavior; a single pack or bundle is meaningless without its manifest.
- Studio registers no associations. Its only import is opening a folder.

## Asset packs: per-unit sharding

Packs are sharded by unit, which matches how authors think and keeps each pack bounded and each
diff legible ("you changed unit 3, re-upload unit 3").

- **Home assignment.** A blob's home is the earliest unit, by outline order, that references it.
  A blob used in unit 1 and unit 12 lives only in unit 1's pack; unit 12 resolves it through the
  manifest.
- **Stickiness.** Once Studio has assigned a blob to a pack (recorded in the publish state), it
  stays there even if its first-use unit later moves, as long as that pack still exists. Without
  this, reordering units would silently rewrite packs and force needless re-uploads.
- **Re-homing on delete.** If a unit is deleted, its pack's still-referenced blobs migrate to
  the next surviving unit that uses them, or to the common pack. This is a rare, larger
  re-upload.
- **Size-cap splitting.** A unit whose blobs exceed the cap is split into multiple part files,
  each kept under a portability cap that respects common host upload limits, some as low as 2 GB
  (target around 1.5 GB).
- **Common pack.** `common.akp` holds course-level assets (cover image, author avatar) and any
  blob not attributable to a unit, and is the re-home fallback target.
- **Reachability.** Only blobs reachable from the outline (units to lessons to parts to
  bindings, and through bound content records) are packed. Media attached to library records not
  placed in any lesson is authoring-only and is excluded.

Pack files are **content-named and immutable**: the filename carries the stable unit id (so an
author can see which unit a pack belongs to) plus a short hash of the pack's contents, for
example `unit-8f3a-1a2b3c4d.akp`. A changed unit produces a pack with a new hash and therefore a
new filename; the old file is never overwritten. This is what makes uploads safe on any host and
CDN caching trivial: every pack URL is immutable. Only `manifest.json` is mutable and replaced on
each publish. The unit id is used for legibility only; correctness still flows through the
manifest's sha256 index, and reordering or renaming units never forces a repack. Example set for
a course:

```
beginner-italian.akc
common-9f0e1d2c.akp
unit-8f3a-1a2b3c4d.akp
unit-8f3a-5e6f7a8b.akp
unit-b217-0c1d2e3f.akp
manifest.json
```

## Keeping `release/` current

There is no export step. Studio owns `release/` and keeps it in sync with the course
automatically, which is safe because `release/` is just files in the folder Studio already
autosaves and nothing is published until the author chooses to upload or commit.

- **Text and structure edits update the cheap files immediately.** They only touch the small
  `.akc` and `manifest.json`, so Studio rewrites those on save.
- **Media edits rebuild one pack, when they happen.** A unit's `.akp` is rebuilt only when that
  unit's media set actually changes (an asset imported, replaced, or removed), debounced or on
  idle rather than on every keystroke. Media changes are discrete and rare, so this stays cheap.
- **Orphans are removed and units re-homed in the same pass.** Packs the current manifest no
  longer references are deleted, and a deleted unit's still-used blobs move to a surviving pack.
  There is no separate compaction step; `release/` always mirrors the current manifest.
- **The revision bumps on change.** The manifest carries a Studio-managed monotonic `revision`
  that advances whenever `release/` changes, so a learner app detects updates reliably without the
  author bumping anything by hand. The author's own `project.version` (the course-details field)
  rides along as a human-facing label and never has to be touched for updates to work.
- **Validation is a status, not a gate.** With no export moment to block, Studio shows a
  persistent release status instead: up to date, rebuilding, or has errors. A broken reference
  leaves the last good `release/` in place and flags the problem rather than writing a broken one.

Studio keeps a small local **change record** to drive the version and power the release history:
the sha256-to-pack map, the current version, an append-only **history** of the changes it has made
to `release/`, and any user-declared upload marks (below). It lives in Studio's application data,
keyed by the `id` in `project.json`, not in the course folder, so the folder stays format-pure and
safe to copy, upload, or commit. The version and pack assignments are recoverable from `release/`
(the version is in `manifest.json`, and pack contents reveal their assignments), so losing the
record only costs the history. A manual **Rebuild release** action recreates `release/` from
scratch if it is ever hand-edited, deleted, or out of step.

Because the manifest is always complete and packs are immutable, hosting an update is safe on any
host: the changed files are added and `manifest.json` is replaced, and nothing already served is
disturbed. On a host that keeps prior files (git history, or a store the author does not prune),
old packs simply linger harmlessly; on one the author manages directly, they can mirror `release/`
exactly. A partial update assumes the host already holds the unchanged packs.

## Distribution invariants

- **The manifest is always complete**, listing every current pack even when only one changed, so
  a host always has the full map of the course.
- **Version lives in the manifest.** It is a monotonic value the learner app compares to detect
  updates, with no dependency on host features, tags, or history.
- **Content addressing is per course.** Each course's blobs live only with that course;
  deduplication is within a course and across its versions, not across authors.

Discovery is separate from hosting. Registration is manual: the author opens a pull request
against the Asakiri website repository, adding an entry that maps the course to its public
manifest URL plus title, language, and license, wherever that URL is hosted. This follows the
shadcn registry pattern, a JSON registry in a public repo that contributors add to by PR. Studio
does not automate this.

## manifest.json schema

```json
{
  "format": "asakiri-package",
  "formatVersion": 1,
  "course": {
    "id": "course_beginner_italian",
    "revision": 5,
    "version": "2.1",
    "title": "Beginner Italian",
    "defaultLocale": "en",
    "data": {
      "name": "beginner-italian.akc",
      "sha256": "…",
      "byteSize": 41984
    }
  },
  "packs": [
    {
      "name": "unit-8f3a-1a2b3c4d.akp",
      "sha256": "…",
      "byteSize": 1503232
    }
  ],
  "assets": {
    "<asset-sha256>": {
      "pack": "unit-8f3a-1a2b3c4d.akp",
      "offset": 0,
      "length": 20345,
      "mime": "image/webp",
      "byteSize": 20345
    }
  }
}
```

`assets` is keyed by blob sha256, so the client reads an `asset.json` from the `.akc` to learn a
blob's hash, then looks the hash up here to find its pack and byte range. `offset` and `length`
are the precomputed position of the blob's stored bytes inside the `.akp`, so a client can
HTTP-range-fetch a single blob without downloading or parsing the whole pack. Blobs are stored,
not re-compressed.

The course carries two versions, with distinct roles. `revision` is a Studio-managed monotonic
integer, bumped on every change to `release/`; it is the reliable key a learner app compares to
decide whether an update exists. `version` is the author's own string from the course-details field
(`project.version`); it is a human-facing label the learner app displays and never drives update
detection, since a hand-set value would not change on every edit. The two are complementary: the
`revision` says "something changed," and the `version` says "the author calls this 2.1." When the
author changes `project.version`, that moment is also a natural milestone in the release history.

Files are referenced by `name` and resolved relative to wherever the manifest is served, so the
manifest is host-agnostic and needs no baked-in URLs. A host that cannot serve every file from
one location may add an optional `url` per entry; when present the learner app uses it, otherwise
it falls back to relative resolution. One code path serves every host.

## What the author does

For hosting there is no export button and no scope dialog. `release/` is always current, so the
author's only actions are the ones outside Studio: commit and push, or upload the changed files to
their host. Git users lean on `git status`; everyone else reads the release history (below), which
Studio keeps authoritatively, to see what changed and decide what to send. The release chip in the
header surfaces both at a glance. If a particular backend wants a single file, the author zips the
`release/` folder themselves.

## The release history

Studio cannot know what the author has uploaded to a host; there is no reliable way to learn that
without asking. So it does not pretend to. Instead it keeps an authoritative **history** of the
changes it has made to `release/`, which it does know exactly because it makes every change. With
git, `git log` and `git status` play the same role; the history gives non-git authors the
equivalent.

Each entry records one change to `release/`: a timestamp, the resulting version, and the files
touched, split into **added or replaced** and **deleted** (a superseded pack Studio pruned), each
paired with a plain-language label ("Unit 7 media", "lessons and wording"). Rapid consecutive edits
collapse into a single entry so the history reads as meaningful moments rather than one line per
keystroke.

The author reads the history to decide what to send, comparing it against what they remember
uploading. Optionally they can **mark an entry as uploaded**. Because only the author knows this,
it is a user-declared bookmark, never inferred: once set, Studio shows the cumulative set of files
changed since that point as a suggested upload. Unmarked, Studio simply shows the history and the
current version.

None of this is a correctness gate. Packs are immutable and content-named, so re-sending an
unchanged file is a no-op and a superseded pack left on the host is harmless. The history is
guidance for the author, nothing the course depends on.

## Release status in the header

Distribution has no screen of its own and no navigation destination. It lives in the workspace
header, which already holds the autosave status; the release status sits beside it as a second
chip. Both are per-course and glanceable.

- **Save chip** (existing): transient, about the folder. Saving, then Saved.
- **Release chip** (new): persistent, about the release. It reads the current version and when it
  last changed, or rebuilding, or errors. If the author has marked an entry as uploaded, it can
  also read the count of files changed since that mark.

Hovering the release chip opens a semi-big popover showing the **release history**, most recent
first:

- each entry expandable to its **added or replaced** and **deleted** files, with plain-language
  labels;
- a per-entry **Mark as uploaded** bookmark, and, when one is set, a summary at the top of the
  cumulative files changed since it;
- an **Open release folder** action so the author can grab the files to upload;
- when validation fails, the **problems** in author terms with a jump to fix, and a note that the
  last good `release/` is untouched.

Hover is only the fast path. The chip is a focusable control, so the popover also opens on keyboard
focus and on tap, and dismisses on Escape, per the keyboard and touch requirements in
[design.md](../design.md). The chip reuses the shared `Status` look for consistency with the save
chip, extended to trigger the popover. Git users can ignore the chip and read `git status` instead;
a one-line hint in the popover says so.

## Sideloading

For handing a course to someone directly, or loading it into the learner app with no host at all,
**File > Export** writes a single `.asakiri` file, a zip of the current `release/` folder. It is a
deliberate, occasional action kept in the File menu rather than in the main workflow, since the
common path is hosting the auto-maintained `release/`. The learner app opens a `.asakiri` the same
way it reads a hosted course, because the files inside are identical; only the entry point differs
(a local file rather than a manifest URL). A `.asakiri` is always a complete course, so it is a
full snapshot, never a partial update.

## Learner sync flow

1. Obtain the `manifest.json`, either by fetching it from the course's public location or by
   reading it from an opened `.asakiri` file.
2. Read the `.akc` (fetched or from inside the `.asakiri`) and unzip it to get the JSON tree minus
   binaries.
3. Collect the required blob sha256 set from the `asset.json` files.
4. Diff against a global local blob cache (for example `~/asakiri/blobs/<ab>/<sha>`), fetch only
   missing blobs by range from their packs, and verify each hash on arrival.
5. Materialize `media/` by linking cache blobs into place by hash.

Because the cache is content-addressed and global, a second course reusing the same photos costs
almost nothing, and because packs are per-unit the learner app can **stream by progress**:
fetch a unit's pack when the learner reaches it rather than downloading the whole course up
front. Cross-unit shared blobs resolve to earlier packs the learner has usually already cached.

## Deferred

- Private or paid courses, which a public host does not gate and which would need an
  authenticated host and access control. The sha-addressed, host-agnostic design keeps this open
  without reworking the format.
