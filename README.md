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

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before adding a feature, [docs/UI-SYSTEM.md](docs/UI-SYSTEM.md) before creating interface components, and [docs/CONTENT-ARCHITECTURE.md](docs/CONTENT-ARCHITECTURE.md) before changing reusable content, media bindings, or exercises. Repository-wide agent rules are in [AGENTS.md](AGENTS.md).

The on-disk course structure is intentionally deferred. This repository does not assume a single `course.json` file.

A provisional, validated data fixture lives at [examples/courses/japanese-starter](examples/courses/japanese-starter). It exists to test architectural decisions and is not a committed storage specification.
