# CSS Modules Implementation Guide

## Overview

While the Reveries project follows a Tailwind-first approach, CSS Modules can be useful for specific scenarios where component-scoped styles are necessary.

## When to Use CSS Modules

CSS Modules should ONLY be used when:
1. Integrating third-party libraries that require style overrides
2. Creating complex animations that can't be achieved with Tailwind
3. Building highly specialized components with unique styling needs
4. Isolating experimental styles during development

## Implementation

### 1. Enable CSS Modules in Vite

CSS Modules are already supported in Vite. Files with `.module.css` extension are automatically processed as CSS Modules.

### 2. Component Example

```tsx
// Button.module.css
.button {
  /* Only for styles that can't be achieved with Tailwind */
  position: relative;
  isolation: isolate;
}

.button::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, 
    rgb(var(--color-primary)),
    rgb(var(--color-secondary))
  );
  border-radius: inherit;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s;
}

.button:hover::before {
  opacity: 1;
}

// Button.tsx
import styles from './Button.module.css';
import { cn } from '@/utils/cn';

export const Button = ({ className, ...props }) => (
  <button
    className={cn(
      // Tailwind utilities first
      'px-4 py-2 rounded-md font-medium',
      'bg-primary text-white',
      'hover:bg-primary-hover',
      'transition-colors',
      // CSS Module for complex effects
      styles.button,
      // User-provided classes
      className
    )}
    {...props}
  />
);
```

### 3. Naming Convention

- File: `ComponentName.module.css`
- Classes: Use camelCase for multi-word class names
- Avoid global styles (use `:global()` sparingly)

### 4. TypeScript Support

For TypeScript support, create type definitions:

```bash
npm install -D typed-css-modules
```

Add to package.json scripts:
```json
"css-types": "tcm src --pattern '**/*.module.css' --watch"
```

### 5. Best Practices

1. **Minimal Usage**: Only create CSS modules when Tailwind can't achieve the desired effect
2. **Document Why**: Always comment why a CSS module was necessary
3. **Use CSS Variables**: Reference design tokens from `unified-design-tokens.css`
4. **Avoid Duplication**: Don't recreate Tailwind utilities in CSS modules
5. **Component Coupling**: Keep CSS modules next to their components

### 6. Migration Strategy

If a component needs CSS modules:

1. Create `ComponentName.module.css` file
2. Move only the non-Tailwind styles
3. Import and apply with `cn()` utility
4. Document the reason in the CSS file

### 7. Example Use Cases

#### Complex Animation
```css
/* LoadingSpinner.module.css */
.spinner {
  /* Complex keyframe animation not in Tailwind */
  animation: quantum-spin 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes quantum-spin {
  0%, 100% { 
    transform: rotate(0deg) scale(1);
    filter: hue-rotate(0deg);
  }
  50% { 
    transform: rotate(180deg) scale(1.1);
    filter: hue-rotate(180deg);
  }
}
```

#### Third-Party Override
```css
/* MapComponent.module.css */
/* Override Mapbox styles that can't use Tailwind */
.mapContainer :global(.mapboxgl-popup) {
  background: rgb(var(--color-surface));
  color: rgb(var(--color-text-primary));
}
```

## Conclusion

CSS Modules are available but should be used sparingly. The Tailwind-first approach with the unified design token system should handle 95%+ of styling needs. Only reach for CSS modules when absolutely necessary, and always document why.