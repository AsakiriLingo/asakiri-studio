# Architecture

Asakiri Studio uses a feature-first React architecture with an explicit dependency direction. The aim is to keep course editing independent from the environment that reads and writes local files.

```text
main.tsx
   │
   ▼
app (composition and providers)
   ├──────────────► features (product behavior)
   └──────────────► platform (Chromium and Tauri adapters)
                         │
features ────────────────┴────► shared (contracts and UI primitives)
```

## Directories

- `src/app`: application bootstrap, dependency injection, global providers, routing, and global styles.
- `src/features/<feature>`: a vertical product slice. A feature owns its components, hooks, model, tests, and application logic.
- `src/platform`: concrete integration code for browser APIs and Tauri plugins.
- `src/shared`: stable contracts, generic utilities, and low-level reusable components. Shared code must not know about a product feature.
- `src-tauri`: the native shell and narrowly scoped native capabilities.

## Dependency rules

1. The app composition root can import feature public APIs, platform factories, and shared code.
2. A feature can import only its own internals and shared code.
3. A platform adapter can import only platform and shared code.
4. Shared code can import only shared code and third-party packages.
5. Code outside a feature imports `@features/<feature>`, never one of its internal files.

`pnpm check:boundaries` enforces these rules. TypeScript path aliases make the intended dependency visible in every import.

## Feature shape

Add only the folders a feature needs:

```text
src/features/lesson-editor/
├── components/       React views owned by the feature
├── hooks/            UI orchestration
├── model/            feature state and domain types
├── services/         framework-free application logic
├── tests/            behavior tests
└── index.ts          public API
```

Keep framework-free logic out of components. Components should translate user actions into feature operations and render explicit state.

## Platform ports

Features depend on contracts, not implementations. For example, `ProjectDirectoryGateway` lives in shared contracts. The app selects either the Chromium File System Access adapter or the Tauri dialog adapter and injects it into the project-hub feature.

Follow the same pattern for future persistence:

- define operations around user intent, not low-level filesystem calls;
- keep browser handles, absolute paths, and Tauri command payloads inside adapters;
- expose typed failures and capabilities where platform behavior differs;
- test feature logic with an in-memory contract implementation.

The course-file structure is deliberately not represented yet. When it is decided, introduce a versioned storage manifest and migrations behind a repository contract; do not let UI components parse or write JSON directly.

## State

Start state locally in the owning feature. Lift state only when two independent feature surfaces must share it. Introduce a state library only when React state and injected services no longer express the required lifecycle clearly.

## Adding a feature

1. Create `src/features/<feature>/index.ts` and only the internal folders needed.
2. Define product types and behavior inside the feature.
3. Put environment-neutral cross-layer contracts in `src/shared/contracts`.
4. Add concrete integrations in `src/platform`.
5. Connect them in `src/app`.
6. Add behavior tests beside the feature code.
7. Run `pnpm check`.
