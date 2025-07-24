# CSS & Styling Guide

## Core Principle: Tailwind-First

This project follows a **Tailwind-first** approach. Use Tailwind utility classes for all styling unless absolutely necessary to use custom CSS.

## Styling Hierarchy

1. **Tailwind Utility Classes** (Preferred)
2. **Component-Specific CSS** (When Tailwind insufficient)
3. **CSS-in-JS** (For dynamic, runtime styles only)

## ✅ DO's

### 1. Use Tailwind Utilities Directly in Components

```tsx
// GOOD - Direct Tailwind usage
<button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors">
  Click me
</button>

// GOOD - Semantic color classes from our unified system
<div className="bg-background text-text-primary border border-border rounded-md p-4">
  Content
</div>
```

### 2. Use Semantic Color Classes

```tsx
// GOOD - Using semantic colors
<div className="bg-surface text-text-primary">
<div className="text-text-secondary">
<button className="bg-primary hover:bg-primary-hover">

// BAD - Using specific color values
<div className="bg-gray-100 text-gray-900">
<button className="bg-yellow-500">
```

### 3. Compose Complex Styles with cn() Helper

```tsx
import { cn } from '@/lib/utils';

// GOOD - Conditional classes with cn()
<div className={cn(
  "px-4 py-2 rounded-lg transition-colors",
  "bg-surface border border-border",
  isActive && "bg-primary text-white",
  disabled && "opacity-50 cursor-not-allowed"
)}>
```

### 4. Extract Repeated Patterns to Components

```tsx
// GOOD - Reusable component with consistent styling
export const Card = ({ children, className, ...props }) => (
  <div 
    className={cn(
      "bg-surface rounded-lg border border-border p-6 shadow-sm",
      className
    )}
    {...props}
  >
    {children}
  </div>
);
```

## ❌ DON'Ts

### 1. Don't Create Custom CSS Classes for Basic Styling

```css
/* BAD - Unnecessary custom class */
.my-button {
  @apply px-4 py-2 bg-blue-500 text-white rounded;
}

/* Use Tailwind directly instead */
```

### 2. Don't Use Inline Styles for Static Values

```tsx
// BAD - Static inline styles
<div style={{ padding: '16px', backgroundColor: '#f3f4f6' }}>

// GOOD - Use Tailwind
<div className="p-4 bg-gray-100">
```

### 3. Don't Mix Styling Approaches

```tsx
// BAD - Mixed approaches
<div 
  className="custom-card p-4" 
  style={{ margin: '10px' }}
>

// GOOD - Single approach
<div className="bg-surface rounded-lg p-4 m-2.5">
```

## When to Use Custom CSS

Only create custom CSS when:

1. **Complex Animations** - Keyframes beyond Tailwind's capabilities
2. **Third-party Library Overrides** - When you need to override external styles
3. **Browser-Specific Hacks** - For specific browser compatibility

Example of acceptable custom CSS:

```css
/* Complex animation that Tailwind can't handle */
@keyframes matrix-rain {
  0% {
    transform: translateY(-100%) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(360deg);
    opacity: 0;
  }
}

.matrix-animation {
  animation: matrix-rain 4s linear infinite;
}
```

## Component Styling Patterns

### 1. Base Component Pattern

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

const buttonVariants = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-surface text-text-primary border border-border hover:bg-surface-alt',
  ghost: 'text-text-primary hover:bg-surface-alt',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
};

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children,
  ...props 
}) => (
  <button
    className={cn(
      'rounded-md transition-colors font-medium',
      buttonVariants[variant],
      buttonSizes[size],
      className
    )}
    {...props}
  >
    {children}
  </button>
);
```

### 2. Responsive Design Pattern

```tsx
// GOOD - Mobile-first responsive design
<div className="
  p-4 
  sm:p-6 
  md:p-8 
  lg:p-10
  
  grid 
  grid-cols-1 
  sm:grid-cols-2 
  lg:grid-cols-3 
  gap-4
">
```

### 3. Dark Mode Pattern

```tsx
// GOOD - Using CSS variables that automatically adjust
<div className="bg-background text-text-primary">
  {/* Colors automatically switch with [data-theme="dark"] */}
</div>

// Avoid Tailwind's dark: prefix, use CSS variables instead
```

## State & Interaction Patterns

### Hover States
```tsx
<button className="hover:bg-primary-hover hover:scale-105 transition-all">
```

### Focus States
```tsx
<input className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
```

### Active States
```tsx
<button className="active:scale-95 active:bg-primary-active">
```

### Disabled States
```tsx
<button className="disabled:opacity-50 disabled:cursor-not-allowed">
```

## Typography Patterns

```tsx
// Headings
<h1 className="text-3xl font-bold text-text-primary">
<h2 className="text-2xl font-semibold text-text-primary">
<h3 className="text-xl font-medium text-text-primary">

// Body text
<p className="text-base text-text-primary">
<p className="text-sm text-text-secondary">
<p className="text-xs text-text-tertiary">

// Links
<a className="text-primary hover:text-primary-hover underline transition-colors">
```

## Spacing Patterns

Use consistent spacing scale:

```tsx
// Padding
<div className="p-2">   // 8px
<div className="p-4">   // 16px
<div className="p-6">   // 24px
<div className="p-8">   // 32px

// Margin
<div className="m-2 sm:m-4 md:m-6">  // Responsive margins

// Gap in flex/grid
<div className="flex gap-4">
<div className="grid grid-cols-3 gap-6">
```

## Animation Guidelines

1. Use CSS transitions for simple state changes
2. Use Tailwind's animation utilities for basic animations
3. Create custom keyframes only for complex animations
4. Always respect prefers-reduced-motion

```tsx
// Simple transitions
<div className="transition-all duration-200 ease-out">

// Respect motion preferences
<div className="motion-safe:transition-all motion-reduce:transition-none">
```

## File Organization

```
/src/styles/
├── unified-design-tokens.css    # All design tokens
├── globals.css                  # Global styles & resets
└── /components/                 # Component-specific CSS (if needed)
    └── complex-animation.css    # Only for things Tailwind can't do
```

## Migration Checklist

When refactoring existing components:

1. ✅ Remove all `@apply` directives
2. ✅ Convert custom classes to Tailwind utilities
3. ✅ Replace hardcoded colors with semantic classes
4. ✅ Remove unnecessary wrapper divs used only for styling
5. ✅ Consolidate inline styles into className
6. ✅ Use cn() helper for conditional classes
7. ✅ Test responsive behavior
8. ✅ Verify dark mode still works

## Performance Tips

1. **Avoid Dynamic Classes** - Tailwind can't purge dynamic class names
   ```tsx
   // BAD
   <div className={`text-${color}-500`}>
   
   // GOOD
   <div className={color === 'red' ? 'text-red-500' : 'text-blue-500'}>
   ```

2. **Use CSS Variables for Dynamic Values**
   ```tsx
   // For truly dynamic values
   <div 
     className="bg-primary"
     style={{ '--tw-bg-opacity': opacity }}
   >
   ```

3. **Minimize Custom CSS** - Every custom class adds to bundle size

## Tooling

### VS Code Extensions
- **Tailwind CSS IntelliSense** - Autocomplete and linting
- **Headwind** - Auto-sort Tailwind classes

### ESLint Rules
```json
{
  "rules": {
    "tailwindcss/classnames-order": "warn",
    "tailwindcss/no-custom-classname": "warn"
  }
}
```

### Prettier Plugin
```bash
npm install -D prettier-plugin-tailwindcss
```

This automatically sorts Tailwind classes in a consistent order.