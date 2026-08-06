# Asakiri Studio

A desktop-first, local-first course editor built with React, TypeScript, Vite, and Tauri. The same feature code runs in Chromium and in the desktop shell; local filesystem behavior is supplied by environment-specific adapters.

## Commands

```bash
pnpm dev          # Chromium development server
pnpm tauri dev    # Tauri desktop development
pnpm test         # feature tests in a browser-like DOM
pnpm check        # boundaries, TypeScript, tests, web build, and Rust
pnpm build        # production web build
```

## Structure

```text
src/
├── app/          Composition root, providers, and global styles
├── core/         Stable product contracts shared across workflows
├── features/     Product slices with explicit public APIs
├── platform/     Chromium and Tauri adapters
└── shared/       Product-agnostic components and utilities
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before adding a feature and [docs/CONTENT-ARCHITECTURE.md](docs/CONTENT-ARCHITECTURE.md) before changing reusable content, media bindings, or exercises. Repository-wide agent rules are in [AGENTS.md](AGENTS.md).

The on-disk course structure is intentionally deferred. This repository does not assume a single `course.json` file.
