# Asakiri Studio agent instructions

These instructions apply to this entire repository.

## Non-negotiable Git rule

- **Never commit code.** Do not run `git commit`, amend commits, create tags, push branches, or open pull requests.
- Do not stage changes unless the user explicitly asks. Leave completed work as uncommitted working-tree changes for the user to review.
- Read-only Git commands are allowed. Never modify `.git` directly.

## Product constraints

- Asakiri Studio is a desktop-first, local-first course editor delivered as a Chromium web app and a Tauri desktop app.
- One course lives in one project directory. Content and media are project-scoped and remain local.
- The course storage schema is intentionally undecided. Do not introduce a single `course.json` or finalize a course-file layout without an explicit product decision.
- Do not add AI, publishing, learner-app, cloud-sync, or persistent Git UI features.

## Architecture rules

- Organize product code by feature under `src/features/<feature>`.
- Every feature exposes a deliberately small public API through `index.ts`. Import another feature only through that public API.
- Features may import their own internals and `src/shared`; they must not import `app`, `platform`, or another feature's internals.
- `src/platform` contains browser/Tauri adapters and may import only `platform` and `shared` code.
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
