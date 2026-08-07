# Codex handover — Asakiri Studio

Handoff for continuing work on Asakiri Studio (desktop-first, local-first course editor; React + Vite + Tauri). Read this, then `HANDOVER.md`, `ROADMAP.md`, `design.md`, and the files in `docs/` before changing code.

## Immediate task: fix the Project Hub design (it looks broken)

The user opened the app and (correctly) called the design "horrible." The Project Hub landing screen is visibly broken. Root cause is diagnosed below — this is the first thing to fix.

### What's wrong (confirmed by running the app at 1280×800)

Files: `src/features/project-hub/components/ProjectHubPage.tsx` and `ProjectHubPage.module.css`.

1. **Create-course card layout is crushed.** The "Create a course" card reuses the `.projectCard` class. At `min-width: 75rem` that class becomes a two-column grid `grid-template-columns: minmax(0, 1fr) auto` (copy | action). For the "Open a project" card the right cell is a single `<Button>` (narrow `auto`). For the "Create a course" card the right cell is a whole `<form>` containing `.createInput` with `flex: 1 1 14rem`. That forces the `auto` column to ~14rem+ and starves the `minmax(0, 1fr)` copy column down to a sliver — so the heading wraps to "Create / a / course" and the description wraps one word per line. This is the main eyesore.
   - **Fix direction:** the create card must NOT reuse the open card's side-by-side grid. Give it its own full-width, stacked layout (copy block on top; the form below it spanning full width, with the input + button on one row). Simplest: a distinct class (e.g. `.createCard`) that is a single-column grid, and let `.createForm`/`.createRow` own the input+button row.

2. **Doubled divider.** Two stacked `.projectCard`s each set `border-block` (top AND bottom hairline), so the seam between them reads as a double line. Use a single shared divider (e.g. only `border-block-start`, or a list with `border-block-end` on all but last).

3. **Hero heading feels unbalanced.** The Newsreader display heading ("Your courses live on your computer.") sits at the bottom-left and runs off the viewport bottom at 800px height. It's within `design.md` allowances (project entry may use one editorial display heading), but its vertical placement/measure needs attention so it doesn't clip. Check `.content` `align-content` and the display clamp.

### Hard constraint for this fix

`design.md` is a **locked design system** and is the source of truth. Work WITHIN it (calm modern-minimal, Asakiri green accent used sparingly, Newsreader display + IBM Plex Sans body, no drop shadows, subtle green-tinted hairline borders, low-radius controls, 4-pt token scale in `src/app/styles/tokens.css`). Do not introduce a new theme or raw color/spacing values — consume the semantic tokens. The project-entry macrostructure is an asymmetric 7/5 canvas (see `design.md` § Macrostructure family).

### How to see it

A Vite dev server is (was) already running on port 1420. `pnpm dev` serves the web build at `http://localhost:1420` — the Project Hub renders there (note: in a plain browser, "Create a course" is intentionally disabled with an "unsupported" notice because creation is Tauri-only; the layout bug is still fully visible). For the real desktop app and the working create flow, run `pnpm tauri dev`. The workspace shell is only reachable after opening/creating a project (needs the native folder picker), so it can't be reached in a headless browser — audit it from code + `design.md`.

### Also audit (from code, then in `pnpm tauri dev`)

- Workspace shell: `src/features/workspace/components/WorkspacePage.tsx` + `.module.css` (sidebar nav rail, work-surface header, empty states) and `ContentCollectionList` in `src/features/content/`. Check rhythm, hierarchy, and that Newsreader is actually used where `design.md` allows and kept out of dense controls.
- Verify fonts are actually loading (a serif fallback to Times would look bad); tokens reference `Newsreader Variable` / `IBM Plex Sans Variable`, bundled locally.

## Non-negotiable working rules (from HANDOVER.md)

- **NEVER commit, stage, push, tag, branch, or open a PR.** Leave all work as uncommitted working-tree changes. Read-only git (`status`, `diff`) is fine.
- **No comments in code** (no inline/block/doc comments, TODOs, commented-out code) unless the user explicitly asks. Exception already in the repo: every CSS Module carries a one-time `/* Hallmark · ... */` provenance banner — match that convention on new CSS modules, but add no other comments.
- Work in **small, reviewable slices**; inspect before editing; state which files you'll change first.
- **Do not touch** `tropes.md` (unrelated untracked user file) or `HANDOVER.md` unless asked.
- All user-facing text uses the strict message contracts; update BOTH `src/app/localization/locales/en.ts` and `ja.ts` when a contract changes. `pnpm typecheck` fails if a locale is incomplete.

## Verify every change

```sh
pnpm check
```

Runs, in order: architecture boundaries → example-course validation → Prettier → ESLint (`--max-warnings 0`) → TypeScript → Vitest → web production build → `cargo check` (Rust/Tauri). At handoff the full check passes with **64 tests**. Useful subsets: `pnpm test -- --run <path>`, `pnpm typecheck`, `pnpm format`, `pnpm check:rust`.

Gotchas seen recently: ESLint `restrict-template-expressions` rejects a bare `number` in template literals (wrap in `String(...)`); `Array.prototype.at()` is outside the TS lib target (use indexing); React's `FormEvent` type is flagged deprecated (infer the event type from an inline handler instead); `react-hooks/set-state-in-effect` forbids synchronous `setState` in an effect body.

## Architecture (strict, feature-based — enforced by `scripts/check-boundaries.mjs`)

- `src/app` composition root · `src/features/<feature>` (public `index.ts` API only) · `src/core/<module>` (cross-feature contracts + ports) · `src/platform` (Chromium/Tauri adapters) · `src/shared` (product-agnostic UI).
- **Features cannot import other features** — compose them at the app layer and pass a `ReactNode` slot down (that is why `ContentCollectionList` is built in `App.tsx` and handed to the workspace as `contentSlot`).
- Cross-core-module imports go through the public `index.ts`; deep imports only within the same module.
- Base UI (behavior) + CSS Modules + semantic tokens + strict TS. Base UI has **no table component** — the content table (roadmap 3.2) must be a semantic `<table>` + CSS Module.
- Icons: the yosooi set, inlined as local SVG in the shared `Icon` component (`src/shared/components/icon`), rendered `<Icon name="…" size={…} />`, `currentColor`. No runtime network. (Hugeicons was removed.) Browse/add icons from https://yosooi.jp/tools/icons/ .

## What's been built (state at handoff)

Tracked in `ROADMAP.md` (kept current). Completed:

- **Phase 1** (workspace frame): nav destinations Content/Media/Lessons; feature-local `WorkSurfaceHeader`; disabled create/import toolbar actions.
- **Phase 2**: `ProjectSession` identity (`core/projects`); read-capability port `ProjectReader` + in-memory impl (`core/project-reading`); workspace open lifecycle validating/ready/invalid (`WorkspaceOpen` + `useProjectValidation`).
- **Phase 3.1**: `ContentCollectionList` (read-only collection list from an in-memory fixture, selection state) — `src/features/content`.
- **Phase 5.1**: storage decision — **Option A, record-per-file** (`docs/STORAGE-DECISION.md`, accepted).
- **Phase 5.2 / 5.3**: read-only repository adapters implementing the approved layout behind `ProjectReader` — platform-agnostic `createLayoutProjectReader` + Tauri (`createTauriProjectFileReader`, injected `readTextFile`) + Chromium (`createBrowserProjectFileReader`, File System Access API), with an identical shared contract suite (`src/platform/project-reading`).
- **Phase 11 (pulled forward — course creation, Tauri-only)**: Project Hub "Create a course" card → name → native folder pick → Rust `create_course` command (`src-tauri/src/course.rs`; `std::fs` + `serde_json` + `git init` via `std::process`, no new crates) → writes `project.json` in the approved layout → opens the workspace. `ProjectCreationGateway` port (`core/projects`) + Tauri/browser adapters (`src/platform/project-creation`).

### Known gaps / next candidates (see ROADMAP.md "Progress")

- **No `ProjectReader` is wired into the running app** — the workspace resolves straight to `ready` and the Content area shows the in-memory fixture, NOT the opened/created course's real content. Wiring the adapter (resolve a session → its handle/root path via a shared registry; for Tauri also add `@tauri-apps/plugin-fs` + Rust plugin + capabilities OR reuse custom Rust commands) closes the loop and is the highest-value next step.
- Course creation has **no partial-creation rollback** (errors are reported, but a partially-written folder isn't cleaned up).
- Not yet started: 3.2 read-only content table, 3.3/3.4, Phase 4 (media), 5.4 (version/migration envelope), Phases 6–10, 12.

## Key files

- Roadmap / rules / design: `ROADMAP.md`, `HANDOVER.md`, `design.md`, `docs/ARCHITECTURE.md`, `docs/UI-SYSTEM.md`, `docs/CONTENT-ARCHITECTURE.md`, `docs/STORAGE-DECISION.md`.
- Design fix targets: `src/features/project-hub/components/ProjectHubPage.tsx` + `ProjectHubPage.module.css`; tokens in `src/app/styles/tokens.css`.
- App composition: `src/app/App.tsx`, `src/app/providers/*`, `src/app/localization/locales/{en,ts}`.
