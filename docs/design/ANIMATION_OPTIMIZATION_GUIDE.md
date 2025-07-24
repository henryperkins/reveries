# Animation Optimization Guide

## Overview

The Reveries project uses an optimized animation system that loads animations on demand, reducing initial CSS bundle size and improving performance.

## Architecture

### 1. Core Animations (Always Loaded)
Located in `animations-optimized.css`, these essential animations are always available:

- **fadeIn/fadeOut** - Basic opacity transitions
- **slideUp/slideDown** - Vertical slide transitions
- **scaleIn/scaleOut** - Scale transitions with opacity
- **pulse** - Simple loading indicator
- **spin** - Basic rotation animation

### 2. Module-Based Animations (Loaded on Demand)

#### Loading Module (`animations-loading.css`)
- **shimmer** - Skeleton loading effect
- **progress-stripes** - Striped progress bars
- **dots** - Three-dot loading indicator
- **skeleton** - Skeleton screen pulse

#### Interactive Module (`animations-interactive.css`)
- **bounce-soft** - Gentle bounce effect
- **ripple** - Material-style ripple
- **shake** - Error feedback shake
- **float** - Floating element effect
- **hover-grow** - Scale on hover
- **click** - Click feedback

#### Westworld Module (`animations-westworld.css`)
- **typewriter** - Terminal typing effect
- **matrix-rain** - Matrix-style rain
- **glitch** - Digital glitch effect
- **circuit** - SVG circuit animation
- **glow** - Pulsing glow effect

## Usage

### Basic Usage with Tailwind

```tsx
// Core animations - always available
<div className="animate-fadeIn">
  Fades in on render
</div>

<button className="hover:animate-pulse">
  Pulses on hover
</button>
```

### On-Demand Animation Loading

```tsx
import { loadAnimationModule } from '@/utils/animationLoader';

// Load interactive animations when needed
async function handleSpecialEffect() {
  await loadAnimationModule('interactive');
  element.classList.add('animate-shake');
}
```

### React Hook Usage

```tsx
import { useAnimationLoader } from '@/utils/animationLoader';

function InteractiveComponent() {
  // Automatically loads the interactive module
  useAnimationLoader('shake');
  
  return (
    <button className="animate-click">
      Click me
    </button>
  );
}
```

### Preloading for Performance

```tsx
import { preloadAnimationModules } from '@/utils/animationLoader';

// In your app initialization
preloadAnimationModules(['loading', 'interactive']);
```

## Performance Guidelines

### 1. Use Core Animations First
Always prefer core animations when possible:
```tsx
// Good - uses core animation
<div className="animate-fadeIn" />

// Only if needed - loads extra module
<div className="animate-typewriter" />
```

### 2. GPU Acceleration
Add performance hints for smooth animations:
```tsx
<div className="animate-slideUp will-animate">
  {/* will-animate adds will-change: transform, opacity */}
</div>
```

### 3. Clean Up After Animation
```tsx
function AnimatedElement() {
  const handleAnimationEnd = () => {
    ref.current?.classList.add('animation-complete');
    // Removes will-change for better performance
  };
  
  return (
    <div 
      className="animate-fadeIn will-animate"
      onAnimationEnd={handleAnimationEnd}
    />
  );
}
```

### 4. Respect Motion Preferences
All animations automatically respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  /* Animations are automatically disabled */
}
```

## Bundle Size Impact

### Before Optimization
- All animations: ~15KB (minified)
- Loaded for every page

### After Optimization
- Core animations: ~2KB (always loaded)
- Loading module: ~2KB (on demand)
- Interactive module: ~3KB (on demand)
- Westworld module: ~4KB (on demand)
- Total savings: ~11KB for most users

## Migration Guide

### From Old System
```tsx
// Old - all animations always loaded
import '@/styles/animations.css';
<div className="animate-glitch" />

// New - loads only when needed
import { useAnimationLoader } from '@/utils/animationLoader';
useAnimationLoader('glitch');
<div className="animate-glitch" />
```

### Tailwind Config
The `tailwind.config.unified.js` includes all core animations:
```js
animation: {
  'fadeIn': 'fadeIn var(--transition-base) var(--easing-out)',
  'slideUp': 'slideUp var(--transition-slow) var(--easing-out)',
  // ... other core animations
}
```

## Best Practices

### 1. Group Related Animations
Load modules based on feature areas:
```tsx
// Loading states page
useEffect(() => {
  loadAnimationModule('loading');
}, []);

// Interactive dashboard
useEffect(() => {
  loadAnimationModule('interactive');
}, []);
```

### 2. Lazy Load Heavy Animations
```tsx
const LazyGlitchEffect = lazy(async () => {
  await loadAnimationModule('westworld');
  return import('./GlitchEffect');
});
```

### 3. Performance Monitoring
```tsx
import { animationPerformanceHints } from '@/utils/animationLoader';

// Check animation performance impact
if (animationPerformanceHints.expensive.includes(animationName)) {
  console.warn(`Animation "${animationName}" is expensive, use sparingly`);
}
```

## Debugging

### Check Loaded Modules
```tsx
import { getLoadedAnimationModules } from '@/utils/animationLoader';

console.log('Loaded animation modules:', getLoadedAnimationModules());
```

### Force Load All Modules (Development)
```tsx
if (import.meta.env.DEV) {
  ['loading', 'interactive', 'westworld'].forEach(module => {
    loadAnimationModule(module);
  });
}
```

## Future Improvements

1. **Critical CSS Extraction**: Extract used animations at build time
2. **Animation Budgets**: Warn when too many animations are loaded
3. **Intersection Observer**: Load animations when elements enter viewport
4. **Service Worker**: Cache animation modules for offline use
5. **Animation Metrics**: Track which animations are actually used