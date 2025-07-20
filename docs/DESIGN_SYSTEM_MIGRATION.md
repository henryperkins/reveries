# Design System Migration Guide

## Overview
This guide outlines the migration from the current inconsistent design system to a unified, theme-agnostic component system.

## Issues Addressed

### 1. Inconsistent Spacing
- **Problem**: Mix of Tailwind classes and inline styles
- **Solution**: Centralized design tokens with consistent spacing scale

### 2. Theme Coupling
- **Problem**: Components tightly bound to Westworld theme
- **Solution**: Theme-agnostic components with configurable themes

### 3. Component Variants
- **Problem**: Handled through props instead of composition
- **Solution**: Composable component system with clear variants

### 4. Z-index Management
- **Problem**: Ad-hoc values risk stacking conflicts
- **Solution**: Centralized z-index scale with semantic naming

## Migration Steps

### Phase 1: Foundation (Completed)
- ✅ Created design tokens (`src/theme/designTokens.ts`)
- ✅ Created component system (`src/theme/componentSystem.ts`)
- ✅ Created theme provider (`src/theme/ThemeProvider.tsx`)
- ✅ Created utility functions (`src/utils/cn.ts`)
- ✅ Created Button component (`src/components/ui/Button.tsx`)
- ✅ Created Card component (`src/components/ui/Card.tsx`)

### Phase 2: Component Updates
- [ ] Update ResearchArea component
- [ ] Update Controls component
- [ ] Update InputBar component
- [ ] Update ResearchStepCard component
- [ ] Update other components to use new system

### Phase 3: Theme Integration
- [ ] Create Westworld theme configuration
- [ ] Create default theme configuration
- [ ] Update Tailwind config to use design tokens
- [ ] Test theme switching functionality

### Phase 4: Cleanup
- [ ] Remove inline styles
- [ ] Consolidate duplicate styles
- [ ] Update documentation
- [ ] Add component stories/tests

## New Component Usage

### Button Component
```tsx
import { Button } from '@/components/ui/Button';

// Basic usage
<Button>Click me</Button>

// With variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>

// With sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// With icons and loading
<Button leftIcon={<Icon />} loading>Loading...</Button>
```

### Card Component
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

<Card variant="elevated" padding="lg">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

## Design Tokens Reference

### Spacing
- `xs`: 0.25rem (4px)
- `sm`: 0.5rem (8px)
- `md`: 1rem (16px)
- `lg`: 1.5rem (24px)
- `xl`: 2rem (32px)
- `2xl`: 2.5rem (40px)
- `3xl`: 3rem (48px)
- `4xl`: 4rem (64px)
- `5xl`: 5rem (80px)

### Z-Index Scale
- `dropdown`: 1000
- `sticky`: 1100
- `banner`: 1200
- `overlay`: 1300
- `modal`: 1400
- `popover`: 1500
- `toast`: 1700
- `tooltip`: 1800

## Migration Examples

### Before (Inconsistent)
```tsx
<div className="p-6 space-y-4 bg-gradient-to-r from-westworld-gold/10 to-transparent rounded-lg border-l-4 border-westworld-gold">
  <h3 className="text-xl font-bold text-westworld-darkbrown mb-2">Title</h3>
</div>
```

### After (Consistent)
```tsx
<Card variant="elevated" padding="lg">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
</Card>
```

## Next Steps
1. Review the new components
2. Start migrating existing components
3. Test theme switching
4. Update documentation
5. Add component tests
