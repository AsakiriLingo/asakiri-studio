# UI system

Asakiri Studio builds its components on [Base UI](https://base-ui.com/react/overview/quick-start), styles them with CSS Modules, and exposes visual decisions through global semantic custom properties.

## Component foundation

- Use Base UI for accessible behavior and composition primitives.
- Wrap Base UI only to add Asakiri defaults, variants, sizes, and token-based styling.
- Preserve Base UI's `render`, state callbacks, native props, and forwarded refs.
- Do not use Button to make a link look like a button. Style an anchor as an action link while preserving link semantics.
- Reusable components live in `src/shared/components/<component>` with their CSS Module, tests, and public `index.ts` together.

The shared Button supports `primary`, `secondary`, and `ghost` variants plus `sm`, `md`, and `lg` sizes. Its default is a native `type="button"` control. Loading workflows should set `disabled` and `focusableWhenDisabled` so focus does not disappear.

## Styling

- `src/app/styles/tokens.css` is the source of global typography, spacing, radii, control sizes, motion, colors, and surface boundaries.
- Component and feature styles use CSS Modules.
- CSS Modules consume semantic variables such as `--color-text` and `--color-brand`; they do not introduce raw color literals.
- Global CSS is limited to tokens, normalization, application-root behavior, and accessibility preferences.
- New colors use OKLCH. Dark mode remaps semantic roles rather than duplicating component rules.
- Use tonal surface changes and separator borders instead of drop shadows or decorative glow.
- Motion must respect `prefers-reduced-motion`.

## Themes

`ThemeProvider` supports `system`, `light`, and `dark` preferences. It stores the preference locally and publishes both the preference and resolved theme on the root element:

```html
<html data-theme="dark" data-theme-preference="system">
```

The inline bootstrap in `index.html` resolves the theme before React loads to avoid a light-theme flash. Components must react only to semantic variables, never query the preference directly for visual styling.

## Localization

Localization is strict and feature-owned:

1. A feature exports its complete message contract from its public API.
2. App-level English and Japanese catalogs must satisfy that contract at compile time.
3. The app injects the localized feature messages as a single feature dependency.
4. Platform adapters return typed error codes instead of user-facing error strings.
5. Native dialog labels are passed into platform ports from the localized feature.

Each supported language has its own catalog module under `src/app/localization/locales/`. The locale registry in that directory's `index.ts` is the only place that combines catalogs, and every catalog must independently satisfy `AppMessages`.

Do not place user-facing text in feature components, hooks, platform adapters, or error objects. Brand names and non-verbal symbols are the only normal exceptions.

When adding a message, update the feature contract and every catalog in the same change. `pnpm typecheck` must fail when a locale is incomplete.
