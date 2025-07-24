# Dark Mode Consolidation Guide

## Overview

This guide explains how dark mode has been consolidated from multiple files into a single, unified implementation using CSS variables and the `[data-theme="dark"]` attribute.

## Old System Problems

1. **Multiple Files**: Dark mode styles scattered across:
   - `/src/styles/dark-mode.css`
   - `/src/theme/` directory with JS-based theming
   - Component-specific dark mode overrides
   - Tailwind's `.dark` class selectors

2. **Inconsistent Implementation**:
   - Some components used `.dark` class
   - Others used `[data-theme="dark"]`
   - JS theme system with complex state management
   - Mixed CSS-in-JS and CSS approaches

3. **Performance Issues**:
   - Runtime style calculations
   - Large JS bundle for theme management
   - Flash of unstyled content (FOUC)

## New Consolidated System

### 1. Single Source of Truth

All dark mode overrides now live in `/src/styles/dark-mode-consolidated.css`:

```css
[data-theme="dark"] {
  /* Core color overrides */
  --color-background: 17 24 39; /* gray-900 */
  --color-surface: 31 41 55; /* gray-800 */
  --color-text-primary: 243 244 246; /* gray-100 */
  /* ... other overrides */
}
```

### 2. Automatic Component Adaptation

Components using semantic color classes automatically adapt:

```tsx
// This automatically switches colors in dark mode
<div className="bg-background text-text-primary border-border">
  Content adapts automatically
</div>
```

### 3. Simple Theme Toggle

```tsx
const toggleTheme = () => {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  // Add transition class
  html.setAttribute('data-theme-transition', 'true');
  
  // Change theme
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  // Remove transition class after animation
  setTimeout(() => {
    html.removeAttribute('data-theme-transition');
  }, 300);
};
```

### 4. Tailwind Configuration

The Tailwind config uses `darkMode: ['class', '[data-theme="dark"]']` to support both approaches during migration.

## Migration Steps

### Step 1: Update Component Classes

Replace color-specific classes with semantic ones:

```tsx
// OLD
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">

// NEW
<div className="bg-background text-text-primary">
```

### Step 2: Remove Dark Mode Utilities

Remove explicit dark mode utilities:

```tsx
// OLD
<button className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-400 dark:hover:bg-blue-300">

// NEW
<button className="bg-primary hover:bg-primary-hover">
```

### Step 3: Update Theme Toggle

Replace complex theme context with simple toggle:

```tsx
// OLD
import { useTheme } from '@/theme';
const { mode, toggleTheme } = useTheme();

// NEW
import { ThemeToggle } from '@/components/ThemeToggle';
<ThemeToggle />
```

### Step 4: Clean Up Imports

Remove old dark mode imports:

```tsx
// Remove these
import '@/styles/dark-mode.css';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useThemeMode } from '@/theme/useTheme';
```

### Step 5: Initialize Theme on Load

Add to your app's entry point:

```tsx
// App.tsx or main.tsx
useEffect(() => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}, []);
```

## Benefits

1. **Performance**: No runtime JS calculations, pure CSS
2. **Simplicity**: Single file to maintain
3. **Consistency**: All components use same approach
4. **Type Safety**: CSS variables with TypeScript support
5. **No FOUC**: Theme applied before render
6. **Smaller Bundle**: Removed theme JS libraries

## Common Patterns

### Conditional Dark Mode Styles

When you need dark-mode-specific styles:

```css
/* In component CSS module or styled component */
[data-theme="dark"] .my-component {
  /* Dark mode specific styles */
}
```

### Dynamic Theme Colors

For dynamic paradigm colors that respect dark mode:

```tsx
<div 
  className="bg-surface text-text-primary"
  style={{
    '--paradigm-accent': `var(--color-paradigm-${paradigm})`
  }}
>
  <span className="text-[rgb(var(--paradigm-accent))]">
    Paradigm-specific colored text
  </span>
</div>
```

### Testing Dark Mode

```tsx
// In tests
beforeEach(() => {
  document.documentElement.setAttribute('data-theme', 'dark');
});

// Or use testing utility
const renderInDarkMode = (component) => {
  document.documentElement.setAttribute('data-theme', 'dark');
  return render(component);
};
```

## Cleanup Checklist

- [ ] Remove `/src/styles/dark-mode.css`
- [ ] Remove `/src/theme/` directory (after migrating needed utils)
- [ ] Update all components to use semantic colors
- [ ] Remove `.dark:` prefixed Tailwind classes
- [ ] Update documentation
- [ ] Test theme persistence across page reloads
- [ ] Verify no FOUC in production build

## Troubleshooting

### Issue: Component not updating in dark mode
**Solution**: Ensure using semantic color classes, not hardcoded colors

### Issue: Flash of wrong theme on load
**Solution**: Add theme initialization script in `<head>`:
```html
<script>
  const theme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
</script>
```

### Issue: Custom component needs dark mode styles
**Solution**: Use CSS attribute selector:
```css
[data-theme="dark"] .my-custom-component {
  /* styles */
}
```