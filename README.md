# Asakiri Studio

A local-first course editor for the desktop, built with React, TypeScript, Vite, and Tauri. The React frontend runs inside the Tauri desktop shell; local filesystem behavior is supplied by Tauri adapters kept behind ports.

## Commands

```bash
pnpm tauri dev    # run the desktop app in development
pnpm dev          # Vite dev server for the frontend only
pnpm test         # feature tests in a jsdom environment
pnpm check        # boundaries, example data, TypeScript, tests, frontend build, and Rust
pnpm build        # type-check and build the frontend bundle
```

## Structure

```text
src/
├── app/          Composition root, providers, and global styles
├── core/         Stable product contracts shared across workflows
├── features/     Product slices with explicit public APIs
├── platform/     Tauri adapters
└── shared/       Product-agnostic components and utilities
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before adding a feature, [docs/UI-SYSTEM.md](docs/UI-SYSTEM.md) before creating interface components, [docs/CONTENT-ARCHITECTURE.md](docs/CONTENT-ARCHITECTURE.md) before changing reusable content, media bindings, or exercises, and [docs/COURSE-FORMAT.md](docs/COURSE-FORMAT.md) before changing anything that is written to disk. Repository-wide agent rules are in [AGENTS.md](AGENTS.md).

To contribute, read [CONTRIBUTING.md](CONTRIBUTING.md), which covers setup, the `pnpm check`
gate, and where AI assistance stands. Participation is governed by
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). To report a vulnerability, follow
[SECURITY.md](SECURITY.md) rather than opening an issue.

The on-disk course format is canonical at version 1 and specified in [docs/COURSE-FORMAT.md](docs/COURSE-FORMAT.md), with JSON Schemas in [schemas/asakiri-course/v1](schemas/asakiri-course/v1). A course is a directory of small JSON files, not a single `course.json`.

A validated reference course lives at [examples/courses/japanese-starter](examples/courses/japanese-starter). `pnpm check` validates it against both the parser and the published schemas.
