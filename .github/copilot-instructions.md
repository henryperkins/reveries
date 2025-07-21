# Reveries Codebase Instructions

## Project Overview
Reveries appears to be a research-oriented web application with a Westworld-themed design system. The project uses a mobile-first responsive approach with careful attention to touch interfaces and safe areas for modern devices.

## Architecture Patterns

### CSS Architecture
- **Tailwind CSS Layers**: Uses `@layer` directives (base, components, utilities) for proper cascade management
- **Design Tokens**: Custom CSS properties for z-index (`--z-fixed`, `--z-sticky`) and colors (`.text-westworld-*`)
- **Mobile-First**: All responsive styles start from mobile and scale up using `min-width` media queries
- **Safe Areas**: Consistently uses `env(safe-area-inset-*)` for modern device compatibility

### Component Structure
Key UI components referenced in styles:
- `input-bar`: Fixed bottom input interface with dynamic positioning
- `research-container` / `research-step`: Main content areas for research workflow
- `paradigm-dashboard`: Dashboard component that repositions on mobile
- `progress-meter-container` / `progress-bar-container`: Progress indicators integrated with input

### Responsive Breakpoints
```css
- Extra small: < 475px (stacks elements, hides non-essential)
- Small: 475px - 639px
- Medium: 640px - 768px (major layout shifts)
- Touch devices: Uses `(hover: none) and (pointer: coarse)`
```

## Development Patterns

### Mobile Considerations
- **Tap Targets**: Minimum 44px height for iOS compatibility on touch interfaces
- **Keyboard Handling**: Suggestions dropdown repositions when keyboard visible (detected via viewport height)
- **Fixed Elements**: Input bar accounts for safe areas and keyboard presence
- **Landscape Mode**: Special handling for landscape orientation with reduced heights

### Accessibility
- `prefers-reduced-motion`: Handled in animations.css (not shown)
- `prefers-contrast`: Increases borders and adjusts color contrast
- Semantic HTML expected with proper ARIA attributes

### CSS Utilities
Project-specific responsive utilities:
- `.space-y-responsive`, `.gap-responsive`: Fluid spacing using `clamp()`
- `.p-responsive`, `.px-responsive`, `.py-responsive`: Fluid padding
- `.safe-padding-*`: Safe area padding helpers
- `.hide-xs`, `.hide-landscape-mobile`: Responsive visibility

## File Organization
```
/src/
  /styles/
    responsive.css    # Responsive design system
    animations.css    # Motion and transitions (referenced)
  /components/      # React components (assumed)
  App.tsx          # Main application component
```

## Key Conventions
1. **Westworld Theme**: Use color names like `westworld-brown`, `westworld-nearblack`
2. **BEM-like Naming**: Components use descriptive names (e.g., `research-container`, `progress-meter-container`)
3. **Fluid Typography**: Use `clamp()` for responsive font sizes
4. **Fixed Positioning**: Bottom-fixed elements must account for safe areas
5. **Z-Index Management**: Use CSS variables (`--z-fixed`, `--z-sticky`) not magic numbers

## Integration Points
- Research workflow with multi-step process (`research-step` components)
- Progress tracking system (progress meters/bars)
- Paradigm dashboard (repositions on mobile)
- Suggestions/autocomplete system (dropdown positioning)

## Testing Considerations
When testing responsive features:
- Test at 474px, 475px (breakpoint boundary)
- Test with keyboard open on mobile (viewport < 500px height)
- Test landscape orientation on mobile devices
- Verify tap targets are ≥ 44px on touch devices
- Check safe area handling on devices with notches/home indicators
