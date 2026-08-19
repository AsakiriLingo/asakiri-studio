# UI system

Asakiri Studio builds its components on [Base UI](https://base-ui.com/react/overview/quick-start), styles them with CSS Modules, and exposes visual decisions through global semantic custom properties.

## Component foundation

- Use Base UI for accessible behavior and composition primitives.
- Wrap Base UI only to add Asakiri defaults, variants, sizes, and token-based styling.
- Preserve Base UI's `render`, state callbacks, native props, and forwarded refs.
- Do not use Button to make a link look like a button. Style an anchor as an action link while preserving link semantics.
- Reusable components live in `src/shared/components/<component>` with their CSS Module, tests, and public `index.ts` together.

The shared Button supports `primary`, `secondary`, and `ghost` variants plus `sm`, `md`, and `lg` sizes. Its default is a native `type="button"` control. Loading workflows should set `disabled` and `focusableWhenDisabled` so focus does not disappear.

Icons come from the [yosooi set](https://yosooi.jp/tools/icons/), inlined as local SVG data in the shared `Icon` component (`src/shared/components/icon`). Render with `<Icon name="…" size={…} />`; strokes use `currentColor`, so icons inherit text color. There are no runtime network calls to the yosooi source — new icons are fetched once (from <https://yosooi.jp/tools/icons/>) and added to `icons.tsx`.

## Styling

- `src/app/styles/tokens.css` is the source of global typography, spacing, radii, control sizes, motion, colors, and surface boundaries.
- Component and feature styles use CSS Modules.
- CSS Modules consume semantic variables such as `--color-text` and `--color-brand`; they do not introduce raw color literals.
- Global CSS is limited to tokens, normalization, application-root behavior, and accessibility preferences.
- New colors use OKLCH. Dark mode remaps semantic roles rather than duplicating component rules.
- Use tonal surface changes and separator borders instead of drop shadows or decorative glow.
- Use `--border-hairline` with `--color-border` for quiet surface separation; reserve `--color-border-strong` for controls that need a distinct boundary.
- Motion must respect `prefers-reduced-motion`.

## Themes

`ThemeProvider` supports `system`, `light`, and `dark` preferences. It stores the preference locally and publishes both the preference and resolved theme on the root element:

```html
<html data-theme="dark" data-theme-preference="system"></html>
```

The inline bootstrap in `index.html` resolves the theme before React loads to avoid a light-theme flash. Components must react only to semantic variables, never query the preference directly for visual styling.

## Localization

Localization is strict and catalog-driven:

1. All user-facing text lives in per-language JSON catalogs under `src/shared/i18n` (`en.json`, `es.json`, `it.json`, `pt.json`, `ru.json`, `ja.json`).
2. English is the source of truth: `StudioMessages` is derived from `en.json`, and every other catalog must satisfy it at compile time.
3. Components read text with `useMessages()`. Parameterized messages use ICU-style `{placeholder}` syntax, including `{count, plural, ...}` forms, and are rendered with `useFormat()` inside components or `formatMessage(locale, ...)` elsewhere.
4. Platform adapters return typed error codes instead of user-facing error strings.
5. Native dialog labels are passed into platform ports from the localized feature.

Catalogs are translated in Lokalise. `pnpm i18n:push` uploads `en.json`; `pnpm i18n:pull` downloads every language back into `src/shared/i18n`. Both read the API token and project id from `lokalise.yml`, which is gitignored; copy the format from the Lokalise CLI docs and never commit it. `src/shared/i18n/catalog.test.ts` fails when catalogs disagree on keys or placeholders.

Do not place user-facing text in feature components, hooks, platform adapters, or error objects. Brand names and non-verbal symbols are the only normal exceptions.

When adding a message, update every catalog in the same change. `pnpm typecheck` must fail when a locale is incomplete.
