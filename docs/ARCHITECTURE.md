# Architecture

Asakiri Studio is a feature-first modular monolith. UI workflows stay inside features, reusable product concepts live in a small core, and Chromium/Tauri differences remain behind platform adapters.

```text
main.tsx
   │
   ▼
app (composition root)
   ├────────► features (user workflows)
   ├────────► platform (Chromium and Tauri adapters)
   └────────► core (product contracts)
                   ▲
features ──────────┤
platform ──────────┘

core, features, platform ─────► shared (generic UI and utilities)
```

## Directories

- `src/app`: bootstrap, dependency injection, routing, global providers, and global styles.
- `src/core/<module>`: stable product concepts and ports shared by multiple features or platform adapters. Examples are projects, content references, media identities, and exercise evaluation contracts.
- `src/features/<feature>`: a vertical user workflow. A feature owns its components, hooks, UI state, application logic, and tests.
- `src/platform`: concrete integrations with Chromium APIs, Tauri plugins, and Rust commands.
- `src/shared`: product-agnostic components and utilities. Shared code must not contain course, content, lesson, exercise, or media concepts.
- `src-tauri`: the native shell and narrowly scoped native capabilities.

`core` is intentionally small. A type belongs there only when at least two independent features need the same product meaning, or when a platform adapter must implement its port. Feature-specific types stay inside their feature.

## Dependency rules

1. `app` can compose feature public APIs, platform factories, core public APIs, and shared code.
2. A feature can import its own internals, core public APIs, and shared code.
3. A platform adapter can import platform code, core public APIs, and shared code.
4. A core module can import itself, shared code, and another core module's public API.
5. Shared code can import only shared code and third-party packages.
6. Code outside a feature or core module imports its `index.ts`, never an internal file.

`pnpm check:boundaries` enforces these directions. TypeScript path aliases make boundary crossings explicit.

## Feature shape

Add only the folders a feature needs:

```text
src/features/lesson-editor/
├── components/       React views owned by the feature
├── hooks/            UI orchestration
├── model/            editor-specific state
├── services/         framework-free workflow logic
├── tests/            larger feature scenarios
└── index.ts          public API
```

Keep framework-free behavior out of components. Components translate user actions into feature operations and render explicit state. Do not create global `domain/` and `application/` dumping grounds; domain behavior stays with its owning feature until it is genuinely shared.

## Core module shape

```text
src/core/content/
├── model/            stable content concepts
├── ports/            persistence or lookup capabilities
├── services/         cross-feature product rules
└── index.ts          narrow public API
```

Core modules should not depend on React, Tiptap, browser handles, Tauri APIs, or JSON file layouts.

## Platform ports

Features depend on product-facing ports, not implementations. `ProjectDirectoryGateway`, for example, lives in `core/projects`. The app selects either the Chromium File System Access adapter or the Tauri dialog adapter and injects it into the project-hub feature.

Follow the same pattern for persistence:

- define operations around user intent rather than raw filesystem calls;
- keep browser handles, absolute paths, and Tauri payloads inside adapters;
- expose platform capabilities and typed failures explicitly;
- test feature behavior with in-memory implementations;
- run the same contract tests against Chromium and Tauri adapters.

The course-file structure remains deliberately undecided. When it is selected, place serialization, versioning, validation, and migrations behind repository ports. UI components must never parse or write project JSON directly.

## State

Use three levels of state:

- editor-local state belongs to Tiptap or the active editor;
- feature workflow state belongs to the owning feature;
- persisted project state is loaded and saved through a repository port.

Do not mirror every Tiptap transaction into a global store. Introduce a shared state library only after two independent feature surfaces genuinely need the same live state.

## Adding a feature

1. Create `src/features/<feature>/index.ts` and only the internals it currently needs.
2. Keep product behavior with the feature until another feature needs the same meaning.
3. Promote stable cross-feature concepts into a focused `src/core/<module>` public API.
4. Add platform implementations in `src/platform` when a core port needs one.
5. Connect concrete implementations only in `src/app`.
6. Add behavior tests beside the feature code.
7. Run `pnpm check`.
