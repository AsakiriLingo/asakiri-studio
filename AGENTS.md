# Asakiri Studio agent instructions

These instructions apply to this entire repository.

## Non-negotiable Git rule

- **Never commit code.** Do not run `git commit`, amend commits, create tags, push branches, or open pull requests.
- Do not stage changes unless the user explicitly asks. Leave completed work as uncommitted working-tree changes for the user to review.
- Read-only Git commands are allowed. Never modify `.git` directly.

## Product constraints

- Asakiri Studio is a desktop-first, local-first course editor delivered as a Chromium web app and a Tauri desktop app.
- One course lives in one project directory. Content and media are project-scoped and remain local.
- Use a content-first domain model with context-first authoring: reusable records can be created in Content or inline from lessons and exercises.
- Content records, media assets, and lesson/exercise compositions are separate concepts. Compositions reference stable IDs; never embed binary data or absolute paths.
- Treat content tables as authoring views, not as a requirement that one table equals one JSON file.
- The course storage schema is intentionally undecided. Do not introduce a single `course.json` or finalize a course-file layout without an explicit product decision.
- Do not add AI, publishing, learner-app, cloud-sync, or persistent Git UI features.

## Architecture rules

- Organize product code by feature under `src/features/<feature>`.
- Every feature exposes a deliberately small public API through `index.ts`. Import another feature only through that public API.
- Put only stable cross-feature product concepts and platform-facing ports in focused modules under `src/core/<module>`.
- Every core module exposes a narrow public API through `index.ts`. Do not use `core` as a generic dumping ground.
- Features may import their own internals, core public APIs, and `src/shared`; they must not import `app`, `platform`, another feature's internals, or core internals.
- `src/platform` contains browser/Tauri adapters and may import only `platform`, `shared`, and core public APIs.
- `src/shared` must remain product-feature and platform agnostic.
- `src/app` is the composition root. It is the only layer allowed to connect features to concrete platform adapters.
- Keep platform objects such as browser file handles and Tauri paths behind contracts. Do not put them in feature state or course domain types.
- Prefer small, composable React components. Forward refs and native HTML props in reusable controls; avoid boolean-prop and configuration-object component APIs.

## Quality bar

- Keep TypeScript strict. Do not bypass it with `any`, blanket type assertions, or disabled checks.
- Represent async UI explicitly, including idle, pending, success, cancellation, and error behavior.
- Preserve keyboard access, visible focus, semantic HTML, and reduced-motion behavior.
- Run `pnpm check` after structural or product changes. Fix failures rather than weakening the checks.
- Add new architecture rules to `scripts/check-boundaries.mjs` when a new dependency direction is introduced.
- Read `docs/CONTENT-ARCHITECTURE.md` before changing content, media, lesson bindings, or exercise options.
