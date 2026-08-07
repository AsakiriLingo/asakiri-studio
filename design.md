# Design: Asakiri Studio

A locked design system for the Studio application. Every Studio screen reads this file before visual changes are made. Extend this system when the product needs a new pattern. Do not create a page-specific theme.

## Genre

Modern-minimal with an editorial brand register. The interface stays technical and quiet. Newsreader marks major page moments; IBM Plex Sans carries the working interface.

## Macrostructure family

- Marketing pages: not applicable. The separate website owns marketing.
- App pages: Workbench. Project entry screens use a compact software command list with focused dialogs for input. Editing screens use a compact navigation region, a focused work surface, and a contextual inspector only when the task requires one.
- Content pages: Long Document inside the work surface. Reading and rich-text editing favor measure and hierarchy over panels.

## Theme

Light mode:

- `--color-canvas` `oklch(0.975 0.01 145)`
- `--color-surface` `oklch(0.992 0.005 145)`
- `--color-surface-subtle` `oklch(0.945 0.014 145)`
- `--color-text` `oklch(0.22 0.018 155)`
- `--color-text-muted` `oklch(0.44 0.018 155)`
- `--color-border` `oklch(0.875 0.014 150)`
- `--color-brand` `oklch(0.44 0.115 155)`
- `--color-focus-ring` `oklch(0.34 0.12 155)`

Dark mode:

- `--color-canvas` `oklch(0.155 0.006 155)`
- `--color-surface` `oklch(0.195 0.007 155)`
- `--color-surface-subtle` `oklch(0.245 0.009 155)`
- `--color-text` `oklch(0.94 0.008 155)`
- `--color-text-muted` `oklch(0.72 0.012 155)`
- `--color-border` `oklch(0.275 0.009 155)`
- `--color-brand` `oklch(0.44 0.115 155)`
- `--color-focus-ring` `oklch(0.82 0.12 155)`

The brand green never changes between modes. Accent coverage stays small: primary controls, focus, active navigation, and compact status signals only.

## Typography

- Display: Newsreader Variable, weight 400, roman.
- Body: IBM Plex Sans Variable, weight 400.
- Mono: IBM Plex Mono when course data or paths require it.
- Display tracking: `-0.04em`.
- Type scale: major third anchored at 16 px.
- Display cap: `clamp(3rem, 7vw, 5.25rem)`.
- Body copy measure: 45 to 65 characters.

Fonts are bundled with the application. No screen depends on a remote font request.

## Spacing

Use the existing 4-point scale in `src/app/styles/tokens.css`. Components consume named tokens and never introduce raw spacing values. App shells may use the 7/5 grid; component internals use flex layouts and smaller rhythmic gaps.

## Motion

- Easings: `--ease-out`, `--ease-in`, and `--ease-in-out`.
- Reveal pattern: none. Application content is present immediately.
- Allowed feedback: button press, functional loading indicators, and explicit state changes.
- Reduced motion: spatial transitions collapse to near-instant feedback. Functional loading remains legible.

## Microinteractions stance

- Successful visible actions are silent.
- Focus rings appear immediately.
- Hover is secondary to keyboard and touch behavior.
- Loading retains a readable action label and adds an inline functional indicator.
- Reversible future actions should prefer optimistic updates with Undo.

## CTA voice

- Primary: compact green fill, 6 px radius, verb-first localized label.
- Secondary: quiet surface with a distinct boundary.
- Ghost: text and icon utility action on tonal hover.
- Status: plain text or compact square signal. Pills are reserved for true filters or tags.

## Per-page allowances

- App pages must not use decorative enrichment. Function carries the screen.
- Project entry uses working-interface typography. Inputs belong in focused dialogs or task surfaces, not in the command list.
- Dense editor screens keep display type out of controls, tables, and inspectors.
- Rich lesson content may use content typography inside the canvas without changing application chrome.

## What screens must share

- The unchanged Asakiri green.
- Newsreader and IBM Plex Sans roles.
- Low-radius controls and no drop shadows.
- Subtle green-tinted boundaries.
- The same focus, disabled, loading, error, and success language.
- Strict localized copy.

## What screens may differ on

- Navigation density according to task depth.
- Whether a contextual inspector is present.
- Canvas measure for tables, rich text, exercises, and media.
- Compact versus spacious rhythm, while staying on the same token scale.

## Exports

The production source is `src/app/styles/tokens.css`. The root `tokens.css` is a portable entry point.

### CSS

```css
:root {
  --color-paper: oklch(0.975 0.01 145);
  --color-paper-2: oklch(0.945 0.014 145);
  --color-ink: oklch(0.22 0.018 155);
  --color-ink-2: oklch(0.44 0.018 155);
  --color-rule: oklch(0.875 0.014 150);
  --color-rule-2: oklch(0.62 0.022 155);
  --color-accent: oklch(0.44 0.115 155);
  --color-accent-ink: oklch(0.98 0.008 155);
  --color-focus: oklch(0.34 0.12 155);

  --font-display: "Newsreader Variable", "Noto Serif JP", serif;
  --font-body: "IBM Plex Sans Variable", "Noto Sans JP", sans-serif;
  --font-outlier: "IBM Plex Mono", ui-monospace, monospace;

  --space-3xs: 0.125rem;
  --space-2xs: 0.25rem;
  --space-xs: 0.5rem;
  --space-sm: 0.75rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2.5rem;
  --space-2xl: 4rem;
  --space-3xl: 6rem;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-md: 1.25rem;
  --text-lg: 1.5625rem;
  --text-xl: 1.953125rem;
  --text-display: clamp(3rem, 7vw, 5.25rem);

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-micro: 120ms;
  --dur-short: 180ms;
  --dur-long: 420ms;

  --rule-hair: 1px;
  --rule-fine: 2px;
  --radius-card: 0.75rem;
  --radius-pill: 9999px;
  --radius-input: 0.375rem;
}
```

### Tailwind v4

```css
@theme {
  --color-paper: oklch(0.975 0.01 145);
  --color-paper-2: oklch(0.945 0.014 145);
  --color-ink: oklch(0.22 0.018 155);
  --color-ink-2: oklch(0.44 0.018 155);
  --color-rule: oklch(0.875 0.014 150);
  --color-accent: oklch(0.44 0.115 155);
  --color-focus: oklch(0.34 0.12 155);
  --font-display: "Newsreader Variable", serif;
  --font-body: "IBM Plex Sans Variable", sans-serif;
  --font-outlier: "IBM Plex Mono", monospace;
  --spacing-3xs: 0.125rem;
  --spacing-2xs: 0.25rem;
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2.5rem;
  --spacing-2xl: 4rem;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-md: 1.25rem;
  --text-lg: 1.5625rem;
  --text-xl: 1.953125rem;
  --radius-card: 0.75rem;
  --radius-pill: 9999px;
  --radius-input: 0.375rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(0.975 0.01 145)", "$type": "color" },
    "paper-2": { "$value": "oklch(0.945 0.014 145)", "$type": "color" },
    "ink": { "$value": "oklch(0.22 0.018 155)", "$type": "color" },
    "ink-2": { "$value": "oklch(0.44 0.018 155)", "$type": "color" },
    "rule": { "$value": "oklch(0.875 0.014 150)", "$type": "color" },
    "accent": { "$value": "oklch(0.44 0.115 155)", "$type": "color" },
    "focus": { "$value": "oklch(0.34 0.12 155)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Newsreader Variable, Noto Serif JP, serif", "$type": "fontFamily" },
    "body": { "$value": "IBM Plex Sans Variable, Noto Sans JP, sans-serif", "$type": "fontFamily" },
    "outlier": { "$value": "IBM Plex Mono, monospace", "$type": "fontFamily" }
  },
  "space": {
    "xs": { "$value": "0.5rem", "$type": "dimension" },
    "sm": { "$value": "0.75rem", "$type": "dimension" },
    "md": { "$value": "1rem", "$type": "dimension" },
    "lg": { "$value": "1.5rem", "$type": "dimension" },
    "xl": { "$value": "2.5rem", "$type": "dimension" }
  },
  "duration": {
    "micro": { "$value": "120ms", "$type": "duration" },
    "short": { "$value": "180ms", "$type": "duration" },
    "long": { "$value": "420ms", "$type": "duration" }
  }
}
```

### shadcn/ui variables

```css
:root {
  --background: 97.5% 0.01 145;
  --foreground: 22% 0.018 155;
  --card: 99.2% 0.005 145;
  --card-foreground: 22% 0.018 155;
  --popover: 99.2% 0.005 145;
  --popover-foreground: 22% 0.018 155;
  --primary: 44% 0.115 155;
  --primary-foreground: 98% 0.008 155;
  --secondary: 94.5% 0.014 145;
  --secondary-foreground: 22% 0.018 155;
  --muted: 94.5% 0.014 145;
  --muted-foreground: 44% 0.018 155;
  --accent: 44% 0.115 155;
  --accent-foreground: 98% 0.008 155;
  --destructive: 48% 0.18 25;
  --destructive-foreground: 98% 0.008 155;
  --border: 87.5% 0.014 150;
  --input: 87.5% 0.014 150;
  --ring: 34% 0.12 155;
  --radius: 0.375rem;
}

.dark {
  --background: 15.5% 0.006 155;
  --foreground: 94% 0.008 155;
  --card: 19.5% 0.007 155;
  --card-foreground: 94% 0.008 155;
  --popover: 19.5% 0.007 155;
  --popover-foreground: 94% 0.008 155;
  --primary: 44% 0.115 155;
  --primary-foreground: 98% 0.008 155;
  --secondary: 24.5% 0.009 155;
  --secondary-foreground: 94% 0.008 155;
  --muted: 24.5% 0.009 155;
  --muted-foreground: 72% 0.012 155;
  --accent: 44% 0.115 155;
  --accent-foreground: 98% 0.008 155;
  --border: 27.5% 0.009 155;
  --input: 27.5% 0.009 155;
  --ring: 82% 0.12 155;
}
```
