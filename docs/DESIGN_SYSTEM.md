# Reveries Design System Documentation

## Overview

The Reveries Design System is built around a cohesive "Westworld" theme, providing a sophisticated and consistent visual language across the application. This document outlines the design tokens, components, and patterns used throughout the application.

## Table of Contents

1. [Design Principles](#design-principles)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing](#spacing)
5. [Components](#components)
6. [Layout System](#layout-system)
7. [Animation & Transitions](#animation--transitions)
8. [Accessibility](#accessibility)
9. [Dark Mode](#dark-mode)
10. [Implementation Guidelines](#implementation-guidelines)

## Design Principles

1. **Consistency**: Use the established design tokens and patterns
2. **Accessibility**: Ensure all components meet WCAG 2.1 AA standards
3. **Performance**: Optimize for fast load times and smooth interactions
4. **Responsiveness**: Design mobile-first with progressive enhancement
5. **Themability**: Support both light and dark modes seamlessly

## Color System

### Westworld Theme Colors

```css
/* Primary Colors */
--color-westworld-gold: #D4AF37;
--color-westworld-dark-gold: #B8941F;
--color-westworld-copper: #B87333;
--color-westworld-dark-copper: #A05A2C;

/* Neutral Colors */
--color-westworld-cream: #FAFAFA;
--color-westworld-beige: #F5E6D3;
--color-westworld-tan: #D2B48C;
--color-westworld-brown: #A0522D;
--color-westworld-dark-brown: #654321;
--color-westworld-near-black: #1A1A1A;
--color-westworld-rust: #8B4513;
--color-westworld-white: #FFFFFF;
```

### Semantic Colors

```css
/* Main semantic mappings */
--color-primary: var(--color-westworld-gold);
--color-secondary: var(--color-westworld-copper);
--color-background: var(--color-westworld-beige);
--color-surface: var(--color-westworld-cream);
--color-text: var(--color-westworld-near-black);
--color-text-muted: var(--color-westworld-brown);
--color-border: var(--color-westworld-tan);

/* State colors */
--color-success: #10B981;
--color-warning: #F59E0B;
--color-error: #EF4444;
--color-info: #3B82F6;
```

### Usage Examples

```jsx
// Using Tailwind classes
<div className="bg-westworld-gold text-westworld-nearBlack">
  Golden content
</div>

// Using CSS variables
.custom-element {
  background-color: var(--color-primary);
  color: var(--color-text);
}
```

## Typography

### Font Families

```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-serif: 'Georgia', 'Times New Roman', serif;
--font-mono: 'JetBrains Mono', 'Consolas', monospace;
```

### Type Scale

| Size | Variable | Pixels | Usage |
|------|----------|--------|-------|
| xs   | --text-xs | 12px | Small labels, hints |
| sm   | --text-sm | 14px | Secondary text |
| base | --text-base | 16px | Body text |
| lg   | --text-lg | 18px | Emphasized body |
| xl   | --text-xl | 20px | Small headings |
| 2xl  | --text-2xl | 24px | Section headings |
| 3xl  | --text-3xl | 30px | Page headings |
| 4xl  | --text-4xl | 36px | Hero headings |
| 5xl  | --text-5xl | 48px | Display text |

### Font Weights

- Thin: 100
- Light: 300
- Normal: 400
- Medium: 500
- Semibold: 600
- Bold: 700
- Extrabold: 800

## Spacing

### Spacing Scale

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| 0 | 0 | 0px | No spacing |
| 1 | 0.25rem | 4px | Tight spacing |
| 2 | 0.5rem | 8px | Small spacing |
| 3 | 0.75rem | 12px | Compact spacing |
| 4 | 1rem | 16px | Default spacing |
| 5 | 1.25rem | 20px | Medium spacing |
| 6 | 1.5rem | 24px | Large spacing |
| 8 | 2rem | 32px | Extra large |
| 10 | 2.5rem | 40px | Section spacing |
| 12 | 3rem | 48px | Major sections |

## Components

### Buttons

```jsx
// Primary button
<button className="btn btn-primary">
  Primary Action
</button>

// Secondary button
<button className="btn btn-secondary">
  Secondary Action
</button>

// Ghost button
<button className="btn btn-ghost">
  Ghost Action
</button>

// Button sizes
<button className="btn btn-primary btn-sm">Small</button>
<button className="btn btn-primary">Medium</button>
<button className="btn btn-primary btn-lg">Large</button>
```

### Cards

```jsx
<div className="card">
  <div className="card-header">
    <h3>Card Title</h3>
  </div>
  <div className="card-body">
    <p>Card content goes here</p>
  </div>
  <div className="card-footer">
    <button className="btn btn-primary">Action</button>
  </div>
</div>
```

### Forms

```jsx
<div className="form-group">
  <label className="form-label">
    Field Label
  </label>
  <input 
    type="text" 
    className="input-field" 
    placeholder="Enter text..."
  />
  <span className="form-error">
    Error message
  </span>
</div>
```

### Badges

```jsx
<span className="badge badge-primary">Primary</span>
<span className="badge badge-secondary">Secondary</span>
<span className="badge badge-success">Success</span>
<span className="badge badge-warning">Warning</span>
<span className="badge badge-danger">Danger</span>
```

## Layout System

### Container Classes

```jsx
// Standard container
<div className="container-app">
  <!-- Max width: 1280px -->
</div>

// Narrow container
<div className="container-narrow">
  <!-- Max width: 1024px -->
</div>

// Wide container
<div className="container-wide">
  <!-- Max width: 1536px -->
</div>
```

### Grid System

```jsx
// Auto-fit grid
<div className="grid-auto">
  <!-- Responsive grid with minimum 280px columns -->
</div>

// Dashboard grid
<div className="grid-dashboard">
  <!-- 1 column mobile, 2 tablet, 3 desktop -->
</div>

// Sidebar layout
<div className="grid-sidebar">
  <!-- 300px sidebar + flexible content -->
</div>
```

### Flex Utilities

```jsx
<div className="flex-center"><!-- Centered content --></div>
<div className="flex-between"><!-- Space between items --></div>
<div className="flex-start"><!-- Align to start --></div>
<div className="flex-end"><!-- Align to end --></div>
```

## Animation & Transitions

### Available Animations

- `animate-fadeIn` - Fade in from opacity 0
- `animate-slideUp` - Slide up from below
- `animate-slideDown` - Slide down from above
- `animate-scaleIn` - Scale in from 0.9
- `animate-shimmer` - Loading shimmer effect
- `animate-pulse-soft` - Gentle pulsing
- `animate-glow` - Glowing effect

### Transition Utilities

```jsx
// Smooth color transitions
<div className="transition-colors">...</div>

// Transform transitions
<div className="transition-transform">...</div>

// All properties
<div className="transition-all-smooth">...</div>
```

## Accessibility

### Focus States

All interactive elements have proper focus states using the Westworld gold color:

```css
:focus-visible {
  outline: none;
  ring: 2px;
  ring-color: var(--color-westworld-gold);
  ring-offset: 2px;
}
```

### Color Contrast

- All text colors meet WCAG AA standards
- Primary text (#1A1A1A) on light backgrounds
- Light text (#FAFAFA) on dark backgrounds

### Reduced Motion

The system respects `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  /* Animations are disabled */
}
```

## Dark Mode

Dark mode is supported through CSS custom properties and the `data-theme` attribute:

```jsx
// Toggle dark mode
document.documentElement.setAttribute('data-theme', 'dark');
```

Dark mode color overrides:
- Background: Near black (#1A1A1A)
- Surface: Dark gray (#2A2A2A)
- Text: Cream (#FAFAFA)
- Borders: Muted gray (#3A3A3A)

## Implementation Guidelines

### 1. Use Design Tokens

Always use design tokens instead of hard-coded values:

```jsx
// ✅ Good
<div className="p-4 text-westworld-gold">

// ❌ Bad
<div style={{ padding: '16px', color: '#D4AF37' }}>
```

### 2. Maintain Consistency

Use the established component classes:

```jsx
// ✅ Good
<button className="btn btn-primary">

// ❌ Bad
<button className="px-4 py-2 bg-yellow-500">
```

### 3. Mobile-First

Design for mobile first, then enhance for larger screens:

```jsx
<div className="p-4 md:p-6 lg:p-8">
  <!-- Responsive padding -->
</div>
```

### 4. Semantic HTML

Use proper HTML elements for better accessibility:

```jsx
// ✅ Good
<button className="btn btn-primary">
<nav className="nav-menu">
<main className="app-main">

// ❌ Bad
<div onClick={...} className="btn btn-primary">
<div className="nav-menu">
<div className="app-main">
```

### 5. Component Composition

Build complex components from smaller, reusable parts:

```jsx
// Compose components
<Card>
  <CardHeader>
    <Badge variant="primary">New</Badge>
    <h3>Title</h3>
  </CardHeader>
  <CardBody>
    <p>Content</p>
  </CardBody>
  <CardFooter>
    <Button variant="primary">Action</Button>
  </CardFooter>
</Card>
```

## File Structure

```
src/
├── styles/
│   ├── index.css         # Main entry point
│   ├── base.css          # Base styles and resets
│   ├── components.css    # Component styles
│   ├── animations.css    # Animation definitions
│   ├── layout.css        # Layout utilities
│   └── design-tokens.css # Design token definitions
├── theme/
│   ├── designSystem.ts   # Design system configuration
│   ├── ThemeContext.tsx  # Theme provider
│   └── ThemeProvider.tsx # Legacy theme provider
└── App.css              # App-specific overrides
```

## Migration Guide

When updating existing components:

1. Replace hard-coded colors with design tokens
2. Use semantic component classes instead of utility combinations
3. Ensure proper z-index hierarchy using tokens
4. Add proper focus states for accessibility
5. Test in both light and dark modes
6. Verify mobile responsiveness

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)