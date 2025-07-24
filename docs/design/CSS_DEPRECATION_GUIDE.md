# CSS Deprecation Guide

## Overview

This guide documents deprecated CSS, theme, and animation files in the Reveries project and provides migration paths to the new unified system.

## Deprecated Files and Migration Paths

### 1. Style Files

#### ❌ DEPRECATED: `/src/styles/design-tokens.css`
**Status**: To be removed  
**Replaced by**: `/src/styles/unified-design-tokens.css`  
**Migration**: Update imports to use unified-design-tokens.css

#### ❌ DEPRECATED: `/src/styles/dark-mode.css`
**Status**: To be removed  
**Replaced by**: `/src/styles/dark-mode-consolidated.css`  
**Migration**: Dark mode is now handled via CSS variables in the consolidated file

#### ❌ DEPRECATED: `/src/styles/theme-utilities.css`
**Status**: To be removed  
**Replaced by**: Tailwind utility classes  
**Migration**: Use Tailwind classes with semantic color names (e.g., `bg-surface`, `text-primary`)

#### ❌ DEPRECATED: `/src/styles/animations.css`
**Status**: To be removed  
**Replaced by**: `/src/styles/animations-optimized.css` + on-demand modules  
**Migration**: Core animations are in animations-optimized.css, others load on demand

#### ❌ DEPRECATED: `/src/styles/interactions.css`
**Status**: To be removed  
**Replaced by**: `/src/styles/animations-interactive.css` (loaded on demand)  
**Migration**: Use animation loader utility to load interactive animations

#### ❌ DEPRECATED: `/src/styles/accessibility.css`
**Status**: Keep but update  
**Note**: Variable names have been fixed to follow naming convention

#### ❌ DEPRECATED: `/src/styles/z-index.css`
**Status**: To be removed  
**Replaced by**: Z-index values in `unified-design-tokens.css`  
**Migration**: Use CSS variables like `var(--z-modal)`

#### ❌ DEPRECATED: `/src/styles/layout.css`
**Status**: To be removed  
**Replaced by**: Tailwind spacing utilities  
**Migration**: Use Tailwind classes like `space-y-4`, `gap-4`

#### ❌ DEPRECATED: `/src/styles/typography.css`
**Status**: To be removed  
**Replaced by**: Typography tokens in `unified-design-tokens.css`  
**Migration**: Use CSS variables like `var(--font-size-lg)`

### 2. Theme System Files

#### ❌ DEPRECATED: `/src/theme/` directory
**Status**: To be removed entirely  
**Replaced by**: CSS-based theming with data attributes  
**Migration Steps**:
1. Remove `ThemeProvider` wrapper from your app
2. Use `[data-theme="dark"]` for dark mode
3. Replace `useTheme` hook with simple theme toggle
4. Remove all imports from `@/theme`

**Deprecated files in `/src/theme/`:
- `index.ts` - Remove all exports
- `ThemeProvider.tsx` - Remove component usage
- `useTheme.ts` - Replace with simple toggle function
- `themeConfig.ts` - CSS variables now in unified-design-tokens.css
- `designSystem.ts` - Values moved to CSS
- `paradigm.ts` - Paradigm colors in CSS variables
- `styled.ts` - Remove CSS-in-JS usage
- `animations.ts` - Use new animation system

### 3. Component Files to Update

#### ⚠️ UPDATE: `/src/components/ThemeToggle.tsx`
**Changes needed**: Simplify to use data attributes instead of context
```tsx
// Old
import { useThemeMode } from '@/theme';

// New
const toggleTheme = () => {
  const current = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', 
    current === 'dark' ? 'light' : 'dark'
  );
};
```

### 4. Configuration Files

#### ❌ DEPRECATED: `/src/styles/tailwind.config.js`
**Status**: To be removed  
**Replaced by**: `/tailwind.config.unified.js`  
**Migration**: Update imports and build configs to use unified config

## Migration Checklist

### Phase 1: Update Imports (Immediate)
- [ ] Replace all imports of `design-tokens.css` with `unified-design-tokens.css`
- [ ] Remove imports of deprecated animation files
- [ ] Update component imports to remove theme dependencies

### Phase 2: Update Components (This Sprint)
- [ ] Update ThemeToggle component
- [ ] Remove ThemeProvider wrapper
- [ ] Update components using `useTheme` hook
- [ ] Replace CSS-in-JS with Tailwind classes

### Phase 3: Clean Up (Next Sprint)
- [ ] Delete deprecated CSS files
- [ ] Remove `/src/theme/` directory
- [ ] Update build configs
- [ ] Run full test suite

## File Status Summary

### Keep (Updated)
- `/src/styles/unified-design-tokens.css` ✅
- `/src/styles/globals.css` ✅
- `/src/styles/dark-mode-consolidated.css` ✅
- `/src/styles/animations-optimized.css` ✅
- `/src/styles/STYLE_GUIDE.md` ✅
- `/tailwind.config.unified.js` ✅

### Remove (Deprecated)
- `/src/styles/design-tokens.css` ❌
- `/src/styles/dark-mode.css` ❌
- `/src/styles/theme-utilities.css` ❌
- `/src/styles/animations.css` ❌
- `/src/styles/interactions.css` ❌
- `/src/styles/z-index.css` ❌
- `/src/styles/layout.css` ❌
- `/src/styles/typography.css` ❌
- `/src/theme/*` (entire directory) ❌
- `/tailwind.config.js` (old one) ❌

### Load on Demand
- `/src/styles/animations-loading.css` 📦
- `/src/styles/animations-interactive.css` 📦
- `/src/styles/animations-westworld.css` 📦

## Common Migration Patterns

### Color Variables
```css
/* Old */
var(--colors-westworld-gold)
var(--color-dolores-500)

/* New */
var(--color-brand-gold)
var(--color-paradigm-dolores)
```

### Animations
```tsx
// Old - all animations loaded
<div className="animate-glitch" />

// New - load on demand
import { useAnimationLoader } from '@/utils/animationLoader';
useAnimationLoader('glitch');
<div className="animate-glitch" />
```

### Theme Usage
```tsx
// Old
import { useTheme } from '@/theme';
const { mode, toggleTheme } = useTheme();

// New
const theme = document.documentElement.getAttribute('data-theme');
const toggleTheme = () => {
  document.documentElement.setAttribute('data-theme', 
    theme === 'dark' ? 'light' : 'dark'
  );
};
```

## Timeline

1. **Immediate**: Update imports and mark files as deprecated
2. **Week 1**: Migrate components to new system
3. **Week 2**: Test thoroughly
4. **Week 3**: Remove deprecated files
5. **Week 4**: Final cleanup and documentation

## Questions?

If you encounter any issues during migration, please:
1. Check the new documentation in `/docs/CSS_ARCHITECTURE.md`
2. Refer to the style guide in `/src/styles/STYLE_GUIDE.md`
3. Test thoroughly in both light and dark modes