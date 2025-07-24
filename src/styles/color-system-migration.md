# Color System Migration Guide

## Overview
This guide explains how to migrate from the current multi-source color system to a unified CSS variables approach.

## Current State (Problems)
1. Colors defined in 3+ places:
   - CSS variables in `design-tokens.css`
   - JavaScript objects in `designSystem.ts`
   - Tailwind config referencing CSS variables
   - Component-specific color definitions

2. Inconsistent naming:
   - `--color-westworld-gold` vs `--paradigm-accent`
   - Hex values in JS vs RGB triplets in CSS

## New Unified System

### Single Source of Truth
All colors are now defined ONLY in `unified-design-tokens.css` as CSS variables using RGB triplets.

### Naming Convention
```css
/* Brand colors */
--color-brand-[name]: R G B;

/* Paradigm colors */
--color-paradigm-[name]: R G B;

/* Semantic colors */
--color-[role]: R G B;
--color-[role]-[state]: R G B;
```

### Usage Patterns

#### In CSS
```css
/* Direct usage */
.element {
  color: rgb(var(--color-text-primary));
  background-color: rgb(var(--color-background));
}

/* With opacity */
.element {
  background-color: rgb(var(--color-primary) / 0.5);
}
```

#### In Tailwind
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Reference CSS variables
        'brand-gold': 'rgb(var(--color-brand-gold) / <alpha-value>)',
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        // Paradigm colors
        'paradigm': {
          'dolores': 'rgb(var(--color-paradigm-dolores) / <alpha-value>)',
          'teddy': 'rgb(var(--color-paradigm-teddy) / <alpha-value>)',
          'bernard': 'rgb(var(--color-paradigm-bernard) / <alpha-value>)',
          'maeve': 'rgb(var(--color-paradigm-maeve) / <alpha-value>)',
        }
      }
    }
  }
}
```

#### In JavaScript/TypeScript
```typescript
// Remove hardcoded colors from designSystem.ts
// Instead, read CSS variables at runtime:

const getCSSVariable = (variable: string): string => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  return `rgb(${value})`;
};

// Usage
const primaryColor = getCSSVariable('--color-primary');
```

## Migration Steps

### Phase 1: Update Tailwind Config
1. Remove all hardcoded color values
2. Reference CSS variables with proper alpha channel support
3. Update all Tailwind class usage to new names

### Phase 2: Remove JavaScript Color Definitions
1. Delete color objects from `designSystem.ts` and `designSystemDark.ts`
2. Create utility functions to read CSS variables
3. Update components using JS color values

### Phase 3: Consolidate CSS Files
1. Replace `design-tokens.css` with `unified-design-tokens.css`
2. Update dark mode to use only CSS variable overrides
3. Remove duplicate color definitions

### Phase 4: Update Components
1. Search for inline styles using color values
2. Replace with CSS variable references
3. Update any styled-components or CSS-in-JS

## Dark Mode Simplification

Instead of multiple approaches, use only CSS variables with data attributes:

```css
/* Light mode (default) */
:root {
  --color-background: 255 253 244;
  --color-text-primary: 51 25 0;
}

/* Dark mode */
[data-theme="dark"] {
  --color-background: 17 24 39;
  --color-text-primary: 243 244 246;
}
```

## Benefits
1. **Single source of truth** - All colors in one file
2. **Consistent naming** - Clear, predictable patterns
3. **Easy theme switching** - Just toggle data attribute
4. **Better performance** - No runtime color generation
5. **Type safety** - Can generate TypeScript types from CSS
6. **Maintainable** - Change colors in one place

## Example Migration

### Before:
```jsx
// JavaScript
const theme = {
  colors: {
    gold: '#D4AF37',
    darkBrown: '#331900'
  }
};

// Component
<div style={{ color: theme.colors.gold }}>

// CSS
.element {
  color: #D4AF37;
  background: var(--color-westworld-cream);
}
```

### After:
```jsx
// Component
<div className="text-brand-gold">

// CSS
.element {
  color: rgb(var(--color-brand-gold));
  background-color: rgb(var(--color-background));
}
```

## Tooling Recommendations

1. **PostCSS Plugin**: Auto-convert hex to RGB triplets
2. **ESLint Rule**: Prevent hardcoded colors in JS/CSS
3. **Stylelint Rule**: Enforce CSS variable usage
4. **VS Code Extension**: Color preview for CSS variables
5. **Build-time Validation**: Ensure all color references exist