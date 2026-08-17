# Contributing to Asakiri Studio

Asakiri Studio is a local-first desktop course editor. It is early software, so expect
rough edges and opinionated architecture.

## Before you start

Open an issue first for anything beyond a small fix. The project has firm product
constraints, and a pull request that adds AI, publishing, cloud sync, learner-app, or
persistent Git UI features will be declined no matter how good the code is. Those
constraints live in [AGENTS.md](AGENTS.md). Read them before you write anything.

Good first contributions: bug fixes with a reproduction, missing keyboard or screen-reader
behavior, Japanese translation corrections, and documentation that was wrong.

## Setup

You need Node 22 or newer, pnpm 11, a Rust toolchain, and the
[Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform.

```bash
pnpm install
```

```bash
pnpm tauri dev
```

`pnpm dev` runs only the Vite frontend. It is useful for the Start screen, but anything
that touches a course needs the Tauri shell, because the filesystem, dialogs, media, and
speech all come from Rust commands.

## The gate

One command has to pass before you open a pull request:

```bash
pnpm check
```

It runs architecture boundaries, the example-course validator, the JSON Schemas, Prettier,
ESLint with zero warnings allowed, TypeScript, the test suite, a production build, and
`cargo check`. Fix failures rather than weakening the checks. If a check is wrong, say so
in the pull request and explain why.

## What the reviewer looks for

- **Layering.** `app` composes, `features` are slices with a small public `index.ts`,
  `core` holds shared contracts and ports, `platform` holds Tauri adapters, `shared` is
  product-agnostic. A feature may not import another feature. `pnpm check:boundaries`
  enforces this, so read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first.
- **Strict TypeScript.** No `any`, no blanket assertions, no disabled checks.
- **All user-facing text is localized.** Add strings to both `src/shared/i18n/en.ts` and
  `ja.ts`. The English catalog defines the contract, so a missing Japanese string is a type
  error.
- **Accessibility.** Keyboard access, visible focus, semantic HTML, and reduced-motion
  behavior are requirements. Build interactive behavior on Base UI rather than hand-rolling
  it.
- **Tokens, not literals.** Colors and spacing come from `src/app/styles/tokens.css`. New
  colors are authored in OKLCH.
- **Anything written to disk.** Read [docs/COURSE-FORMAT.md](docs/COURSE-FORMAT.md).
  Changing an existing key means bumping `formatVersion` and adding a migration; adding an
  optional key or a new activity type does not.

## Tests

`pnpm test` runs Vitest, `cargo test --manifest-path src-tauri/Cargo.toml` runs the Rust
tests. Pure logic should have unit tests. UI work that cannot be exercised in jsdom, which
is most of the workspace, should say in the pull request how you verified it by hand.

## Commits and pull requests

Small, focused commits with a plain description of what changed and why. In the pull
request, describe the behavior before and after, and note anything you could not verify.

## Using AI assistants

Using an AI assistant to write, refactor, or review code here is fine. Much of this
codebase was written with one. There is no disclosure requirement and no separate review
track: a diff is judged on its merits, not on who or what typed it.

You own what you submit:

- You understand every line, and can explain why it works and what it affects.
- You can maintain it, including debugging it later when the assistant is not around.
- You have actually run it. `pnpm check` passing is the floor, not the proof.
- You are responsible for provenance. Do not submit code you believe was reproduced from an
  incompatible licence, and do not paste in code you cannot licence under
  [MPL-2.0](LICENSE).

Pull requests that are clearly unreviewed model output get closed, because nobody stands
behind the code. The usual signs are invented APIs, tests that assert nothing, generated
comments restating the obvious, and a description that does not match the diff.

The product rule is separate. Studio ships no AI features, and the document importer is
deterministic parsing on purpose. Using an assistant to build Studio is fine; putting a model
inside Studio is not.
