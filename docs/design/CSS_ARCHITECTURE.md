# CSS Architecture Documentation

## Overview

The Reveries project follows a **Tailwind-first** CSS architecture with a unified design token system. This approach minimizes custom CSS, improves maintainability, and ensures consistent styling across the application.

## Architecture Principles

1. **Single Source of Truth**: All design tokens defined in one place
2. **Tailwind-First**: Use utility classes for 95% of styling needs
3. **Minimal Custom CSS**: Only for complex animations or third-party overrides
4. **Type-Safe**: CSS variables accessible from TypeScript
5. **Performance-Optimized**: Tree-shaken, split CSS bundles

## File Structure

```
/src/styles/
├── unified-design-tokens.css    # All design tokens (colors, spacing, etc.)
├── globals.css                  # Global styles & Tailwind imports
├── STYLE_GUIDE.md              # Comprehensive styling guide
├── color-system-migration.md    # Migration guide from old system
└── /legacy/                     # Old CSS files (to be removed)
    ├── design-tokens.css
    ├── dark-mode.css
    └── ...
```

## Core Files

### 1. `unified-design-tokens.css`
The single source of truth for all design tokens:
- Colors (brand, paradigm, semantic)
- Spacing scale
- Typography (fonts, sizes, weights)
- Borders & radii
- Shadows
- Transitions
- Z-index scale

### 2. `globals.css`
Minimal global styles:
- Tailwind imports
- CSS resets
- Print styles
- Accessibility enhancements
- Complex animations

### 3. `index-unified.css`
Simple entry point that imports globals and any app-specific overrides.

## Design Token System

### Color System

```css
/* Brand Colors */
--color-brand-gold: 212 175 55;
--color-brand-cream: 255 253 244;

/* Paradigm Colors */
--color-paradigm-dolores: 220 38 38;
--color-paradigm-teddy: 37 99 235;

/* Semantic Colors */
--color-background: 255 253 244;
--color-text-primary: 51 25 0;
--color-primary: 212 175 55;
```

Colors use RGB triplets for easy opacity control:
```css
/* Usage */
color: rgb(var(--color-text-primary));
background: rgb(var(--color-primary) / 0.5);
```

### Naming Convention

```
--[category]-[subcategory]-[variant]: value;

Examples:
--color-brand-gold
--spacing-4
--font-size-lg
--radius-md
--shadow-xl
--z-modal
```

## Dark Mode

Simplified dark mode using CSS variable overrides:

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

Components automatically adapt without code changes.

## Tailwind Configuration

### Simplified Config (`tailwind.config.unified.js`)

```javascript
colors: {
  // Reference CSS variables
  'brand-gold': 'rgb(var(--color-brand-gold) / <alpha-value>)',
  'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
}
```

### Usage in Components

```tsx
// Semantic colors
<div className="bg-background text-text-primary">

// Brand colors
<button className="bg-brand-gold hover:bg-primary-hover">

// Paradigm colors
<div className="text-paradigm-dolores border-paradigm-bernard">
```

## Component Styling Patterns

### Basic Component

```tsx
const Button = ({ variant, size, className, ...props }) => (
  <button
    className={cn(
      // Base styles
      "rounded-md transition-colors font-medium",
      // Variant styles
      variant === 'primary' && "bg-primary text-white hover:bg-primary-hover",
      variant === 'secondary' && "bg-surface border border-border",
      // Size styles
      size === 'sm' && "px-3 py-1.5 text-sm",
      size === 'lg' && "px-6 py-3 text-lg",
      // Custom classes
      className
    )}
    {...props}
  />
);
```

### Responsive Design

```tsx
<div className="
  p-4 sm:p-6 md:p-8
  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
  gap-4 md:gap-6
">
```

### State Management

```tsx
<button className="
  hover:scale-105 
  active:scale-95
  focus:ring-2 focus:ring-primary
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-all
">
```

## Performance Optimizations

### 1. CSS Code Splitting
- Vite automatically splits CSS per route
- Critical CSS inlined for faster FCP

### 2. Development-Only CSS
```typescript
// Conditional loading in dev
if (import.meta.env.DEV && window.location.search.includes('debug')) {
  import('./styles/debug-visibility.css');
}
```

### 3. Build Configuration
```javascript
// vite.config.ts
build: {
  cssCodeSplit: true,
  cssMinify: true,
  rollupOptions: {
    external: (id) => {
      // Exclude debug files
      if (id.includes('debug-visibility')) return true;
    }
  }
}
```

## Linting & Validation

### Stylelint
- Enforces consistent CSS
- Validates CSS variable usage
- Alphabetizes properties

### ESLint with Tailwind Plugin
- Orders Tailwind classes
- Prevents custom classes
- Warns about inline styles

### Scripts
```bash
npm run lint:css        # Lint CSS files
npm run lint:tailwind   # Lint Tailwind usage
npm run lint:all        # Run all linters
npm run lint:fix        # Auto-fix issues
```

## Migration Guide

### From Old System to New

1. **Replace color imports**
   ```tsx
   // Old
   import { colors } from '@/config/designSystem';
   
   // New - use Tailwind classes
   <div className="text-brand-gold">
   ```

2. **Update custom CSS**
   ```css
   /* Old */
   .custom-card {
     background: var(--color-westworld-cream);
     padding: 1rem;
   }
   
   /* New - use Tailwind */
   <div className="bg-brand-cream p-4">
   ```

3. **Simplify dark mode**
   ```tsx
   // Old
   const isDark = theme === 'dark';
   <div style={{ color: isDark ? '#fff' : '#000' }}>
   
   // New - automatic
   <div className="text-text-primary">
   ```

## Best Practices

### DO's ✅
- Use semantic color classes (`text-primary`, not `text-gray-900`)
- Compose styles with `cn()` helper
- Extract repeated patterns to components
- Use Tailwind's responsive prefixes
- Respect motion preferences

### DON'Ts ❌
- Create custom CSS for basic styling
- Use inline styles for static values
- Mix styling approaches
- Hardcode color values
- Ignore accessibility

## Debugging

### Development Tools
1. **CSS Debug Mode**: `?debug-visibility` in URL
2. **Tailwind DevTools**: Browser extension
3. **CSS Variable Inspector**: Chrome DevTools

### Common Issues

**Issue**: Styles not applying
- Check class name spelling
- Verify Tailwind config includes the class
- Ensure CSS variables are defined

**Issue**: Dark mode not working
- Verify `[data-theme="dark"]` on root element
- Check CSS variable overrides exist
- Ensure no hardcoded colors

**Issue**: Performance problems
- Check for unused CSS imports
- Verify tree-shaking works
- Look for runtime style calculations

## Future Improvements

1. **CSS Modules**: Component-scoped styles (if needed)
2. **CSS-in-JS**: For highly dynamic styles
3. **Design Token API**: Generate tokens from single source
4. **Visual Regression Testing**: Catch style changes
5. **Component Library**: Reusable styled components

## Resources

- [Tailwind Documentation](https://tailwindcss.com/docs)
- [CSS Variables Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Vite CSS Features](https://vitejs.dev/guide/features.html#css)
- Internal: `/src/styles/STYLE_GUIDE.md`