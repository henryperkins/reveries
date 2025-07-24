# CSS Variable Naming Convention

## Overview

This document defines the standardized naming convention for CSS custom properties (variables) used throughout the Reveries project.

## Naming Pattern

All CSS variables follow this pattern:
```
--[category]-[subcategory]-[variant]
```

## Categories and Examples

### 1. Colors (`--color-`)
All color-related variables must use the `color` prefix:

```css
/* Brand Colors */
--color-brand-gold
--color-brand-cream
--color-brand-tan

/* Semantic Colors */
--color-background
--color-text-primary
--color-text-secondary
--color-border

/* Paradigm Colors */
--color-paradigm-dolores
--color-paradigm-teddy
--color-paradigm-bernard
--color-paradigm-maeve
--color-paradigm-accent  /* Dynamic paradigm color */

/* State Colors */
--color-success
--color-warning
--color-error
--color-info
```

### 2. Spacing (`--spacing-`)
All spacing values:

```css
--spacing-0    /* 0 */
--spacing-1    /* 0.25rem */
--spacing-2    /* 0.5rem */
--spacing-4    /* 1rem */
--spacing-8    /* 2rem */
--spacing-16   /* 4rem */
```

### 3. Typography (`--font-`)
Font-related properties:

```css
/* Font Families */
--font-family-sans
--font-family-serif
--font-family-mono

/* Font Sizes */
--font-size-xs
--font-size-sm
--font-size-base
--font-size-lg
--font-size-xl

/* Font Weights */
--font-weight-light
--font-weight-normal
--font-weight-medium
--font-weight-semibold
--font-weight-bold

/* Line Heights */
--font-line-height-tight
--font-line-height-normal
--font-line-height-relaxed
```

### 4. Border Radius (`--radius-`)
All border radius values:

```css
--radius-none   /* 0 */
--radius-sm     /* 0.125rem */
--radius-md     /* 0.375rem */
--radius-lg     /* 0.5rem */
--radius-xl     /* 0.75rem */
--radius-2xl    /* 1rem */
--radius-full   /* 9999px */
```

### 5. Shadows (`--shadow-`)
Box shadow definitions:

```css
--shadow-none
--shadow-sm
--shadow-md
--shadow-lg
--shadow-xl
--shadow-2xl
--shadow-inner
```

### 6. Transitions (`--transition-`)
Transition durations:

```css
--transition-fast    /* 150ms */
--transition-base    /* 200ms */
--transition-slow    /* 300ms */
--transition-slower  /* 500ms */
```

### 7. Easing Functions (`--easing-`)
Animation timing functions:

```css
--easing-linear
--easing-in
--easing-out
--easing-in-out
--easing-spring
```

### 8. Z-Index (`--z-`)
Layering values:

```css
--z-base           /* 1 */
--z-dropdown       /* 10 */
--z-sticky         /* 20 */
--z-fixed          /* 30 */
--z-modal-backdrop /* 40 */
--z-modal          /* 50 */
--z-popover        /* 60 */
--z-tooltip        /* 70 */
--z-notification   /* 80 */
--z-max            /* 9999 */
```

### 9. Breakpoints (`--breakpoint-`)
Responsive breakpoints:

```css
--breakpoint-xs    /* 475px */
--breakpoint-sm    /* 640px */
--breakpoint-md    /* 768px */
--breakpoint-lg    /* 1024px */
--breakpoint-xl    /* 1280px */
--breakpoint-2xl   /* 1536px */
```

## Rules and Guidelines

### DO's ✅

1. **Use lowercase with hyphens**: `--color-primary-hover`
2. **Be descriptive**: `--color-text-primary` not `--color-tp`
3. **Group related variables**: All colors start with `--color-`
4. **Use semantic names**: `--color-background` not `--color-white`
5. **Follow the pattern**: `--[category]-[subcategory]-[variant]`

### DON'Ts ❌

1. **No underscores**: ~~`--color_primary`~~
2. **No camelCase**: ~~`--colorPrimary`~~
3. **No abbreviations**: ~~`--clr-pri`~~
4. **No mixed patterns**: ~~`--border-radius-sm`~~ (use `--radius-sm`)
5. **No plural categories**: ~~`--colors-primary`~~ (use `--color-primary`)

## Migration from Old Names

| Old Name | New Name |
|----------|----------|
| `--colors-*` | `--color-*` |
| `--border-radius-*` | `--radius-*` |
| `--shadows-*` | `--shadow-*` |
| `--paradigm-accent` | `--color-paradigm-accent` |
| `--animation-color` | `--color-animation` |

## Validation

The Stylelint configuration enforces these naming conventions:

```json
{
  "custom-property-pattern": "^(color|spacing|font|radius|shadow|transition|easing|z|breakpoint)-[a-z0-9-]+$"
}
```

Run `npm run lint:css` to validate all CSS files follow this convention.

## Examples in Use

### Component Styling
```css
.card {
  background: rgb(var(--color-surface));
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-4);
}
```

### Tailwind Integration
```js
// tailwind.config.js
colors: {
  'primary': 'rgb(var(--color-primary) / <alpha-value>)',
  'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
}
```

### Dark Mode Override
```css
[data-theme="dark"] {
  --color-background: 17 24 39;
  --color-text-primary: 243 244 246;
}
```

## Benefits

1. **Consistency**: All developers use the same naming pattern
2. **Discoverability**: Easy to find related variables
3. **Maintainability**: Clear organization and grouping
4. **Type Safety**: Can generate TypeScript types from patterns
5. **Tooling**: Linters can validate usage
6. **Documentation**: Self-documenting variable names