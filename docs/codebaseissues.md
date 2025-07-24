# Reveries Codebase Issues & Architectural Recommendations

This document captures the **current pain-points** observed in the Reveries front-end codebase and proposes a path toward a more maintainable design-system.  The intent is two-fold:

1.  Provide a _single, shareable reference_ for the issues that are costing time today.
2.  Offer actionable guidelines so that every future PR moves the project in the same direction instead of adding yet another system.

---

## 1  Primary Issues

### 1.1  Paradigm Color System Chaos

```ts
// paradigm.ts (excerpt)
dolores: {
  primary: '#DC2626',       // red-600
  primaryClass: 'bg-red-500', // different shade!
  gradient: ['#F87171', '#DC2626'], // red-400 → red-600
}
```

* Four competing colour sources are now in play: CSS variables, the semantic colour map, Tailwind’s palette **and** the paradigm.ts file above.
* Designers cannot be sure which shade will be rendered.

### 1.2  Animation System Conflicts

```css
/* animations.css */
@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 5px var(--animation-color, theme('colors.westworld.gold'));
  }
}

/* tailwind.config.js */
glow: {
  '0%': { boxShadow: '0 0 5px rgba(212, 175, 55, 0.5)' },
  // hard-coded colour instead of variable
}
```

Two definitions with different sources for their colours yield divergent results between the “raw” CSS build and the Tailwind JIT build.

### 1.3  Responsive Utility Duplication

```css
.p-responsive {
  padding: clamp(0.5rem, 2vw, 1rem);
}
```

Tailwind already exposes `p-2 sm:p-4 lg:p-6` and variants.  The bespoke rule increases bundle size and cognitive load without adding real capability.

### 1.4  Theme Context vs CSS Variables

`ThemeProvider.tsx` maintains React state, while runtime styling relies on CSS variables.  These two sources regularly drift apart, forcing downstream components to patch differences manually.

### 1.5  `fix-visibility.css` Anti-Pattern

```css
* {
  visibility: visible !important;
}
```

Using `!important` on the universal selector is a _nuclear_ debugging move.  Leaving it in production leads to subtle bugs around animation starts, pop-over visibility, and screen-reader flow.

---

## 2  Recommended Architecture

### 2.1  Option A – **Tailwind-first with CSS Variables**  _(recommended)_

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        /* semantic tokens that read from CSS variables */
        primary: 'rgb(from var(--color-primary) r g b / <alpha-value>)',
        surface: 'rgb(from var(--color-surface) r g b / <alpha-value>)',
        'paradigm-accent':
          'rgb(from var(--paradigm-accent) r g b / <alpha-value>)',
      },
    },
  },
};

/* design-tokens.css */
:root {
  /* Single source of truth for colours (R G B form so Tailwind can add opacity) */
  --color-primary: 212 175 55; /* westworld gold */
  --color-surface: 250 246 242;

  /* Paradigm-specific token that can be swapped at runtime */
  --paradigm-accent: var(--color-primary);
}

[data-paradigm='dolores'] {
  --paradigm-accent: 220 38 38; /* red-600 */
}
```

### 2.2  Option B – JavaScript-first Design System

Generate every deliverable (Tailwind config, CSS variables, TS types) from a single TypeScript definition.

```ts
// theme/colors.ts
export const colors = {
  westworld: {
    cream: '#FAF6F2',
    /* … */
  },
  paradigms: {
    dolores: {
      primary: '#DC2626',
      /* … */
    },
  },
} as const;
```

---

## 3  Immediate Tactical Fixes

The following clean-ups are low-risk and will unblock upcoming work even **before** a larger refactor:

1. Delete or rewrite all universal `!important` overrides – keep them only in dev-focused debug sheets.
2. Collapse duplicate animation definitions; choose either a Tailwind `@keyframes` plugin or traditional CSS, not both.
3. Remove hand-rolled utilities that Tailwind already ships (e.g. `p-responsive`).
4. Unify colour references by picking **one** system (see section 2).  Update components gradually, but never introduce a _fifth_ source.
5. Eliminate “debug” CSS files once their root cause has been addressed.

---

## 4  Component Pattern Example

```tsx
// ResearchCard.tsx
export function ResearchCard({ paradigm }: { paradigm: 'dolores' | 'maeve' }) {
  return (
    <div
      className={cn(
        /* semantic tokens */
        'bg-surface text-foreground rounded-lg',
        /* paradigm accent */
        'data-[paradigm=dolores]:border-red-500',
        /* dark-mode tokens */
        'dark:bg-surface-dark dark:text-foreground-dark',
      )}
      data-paradigm={paradigm}
    >
      {/* … */}
    </div>
  );
}
```

---

## 5  CSS File Ordering

```css
/* 1  CSS Variables / Design Tokens */
@import './design-tokens.css';

/* 2  Tailwind Pre-flight (resets) */
@import 'tailwindcss/base';

/* 3  Custom Base Styles */
@import './base.css';

/* 4  Tailwind Component layer */
@import 'tailwindcss/components';

/* 5  Custom Components */
@layer components {
  @import './components/*.css';
}

/* 6  Tailwind Utilities layer */
@import 'tailwindcss/utilities';

/* 7  Custom Utility layer */
@layer utilities {
  @import './utilities/*.css';
}
```

Following this import order ensures that overrides are intentional and predictable.

---

## 6  Next Steps

* Agree upon **one** of the architectural options (section 2) in the next engineering/design sync.
* Convert a single component (e.g. `Button`) to use the new tokens as a “walking skeleton”.
* Enforce the chosen patterns via ESLint / Stylelint / PR templates.

By iterating in thin, vertical slices we avoid a risky “big-bang” migration while still paying down the technical debt documented above.
