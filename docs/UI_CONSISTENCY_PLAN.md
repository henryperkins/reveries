# UI Consistency Implementation Plan

## Overview
This plan outlines the steps to update remaining components to use our unified ProgressMeter component, ensuring a consistent user experience across all progress visualizations.

## Current State
- ✅ Created unified ProgressMeter component with multiple variants
- ✅ Created paradigm theme system for consistent colors
- ✅ Consolidated function call visualizers into FunctionCallDock
- 🔄 Several components still use inline progress bar implementations

## Phase 1: ProgressMeter Enhancement (Priority: High)

### 1.1 Add Stacked Bar Support
**Purpose**: Support ParadigmProbabilityBar's stacked visualization

```typescript
// New variant for ProgressMeter
variant?: 'default' | 'gradient' | 'paradigm' | 'minimal' | 'stacked';

// New props for stacked mode
segments?: Array<{
  value: number;
  color: string;
  label?: string;
}>;
```

### 1.2 Add Multi-Bar Support
**Purpose**: Display multiple related progress bars as a group

```typescript
// New component: ProgressMeterGroup
interface ProgressMeterGroupProps {
  meters: Array<{
    label: string;
    value: number;
    color?: string;
    paradigm?: HostParadigm;
  }>;
  variant?: 'default' | 'paradigm';
  size?: 'sm' | 'md' | 'lg';
  showValues?: boolean;
}
```

### 1.3 Add Compact Mode
**Purpose**: For embedding in cards and tight spaces

```typescript
// New size option
size?: 'xs' | 'sm' | 'md' | 'lg';

// Compact layout option
layout?: 'default' | 'compact' | 'inline';
```

## Phase 2: Component Updates (Priority: High)

### 2.1 Update ParadigmIndicator
**File**: `src/components/ParadigmIndicator.tsx`

**Changes**:
```typescript
// Replace lines 22-33 with:
<ProgressMeterGroup
  meters={Object.entries(probabilities).map(([key, value]) => ({
    label: key,
    value: value * 100,
    paradigm: key as HostParadigm,
  }))}
  variant="paradigm"
  size="sm"
  showValues={true}
/>
```

### 2.2 Update ResearchAnalytics in ParadigmUI
**File**: `src/components/ParadigmUI.tsx`

**Changes**:
```typescript
// Confidence Score (replace lines 250-255):
<ProgressMeter
  value={metadata.confidenceScore * 100}
  variant="minimal"
  colorClass="bg-blue-500"
  size="xs"
  showPercentage={false}
  className="mt-1"
/>

// Complexity Score (replace lines 276-281):
<ProgressMeter
  value={metadata.complexityScore * 100}
  variant="minimal"
  colorClass="bg-purple-500"
  size="xs"
  showPercentage={false}
  className="mt-1"
/>
```

## Phase 3: Complex Visualizations (Priority: Medium)

### 3.1 ParadigmProbabilityBar
**Current**: Custom stacked bar implementation
**Solution**: Use new stacked variant of ProgressMeter

```typescript
<ProgressMeter
  variant="stacked"
  segments={paradigms.map(p => ({
    value: probabilities[p.key] * 100,
    color: PARADIGM_COLORS[p.key].primary,
    label: p.name,
  }))}
  size="md"
  showLabels={true}
/>
```

### 3.2 ContextLayerProgress
**Current**: Custom layer visualization
**Solution**: Create specialized LayerProgress component using ProgressMeter internally

```typescript
<LayerProgress
  layers={layers}
  activeLayer={currentLayer}
  paradigm={paradigm}
  onLayerClick={handleLayerClick}
/>
```

## Phase 4: Visual Consistency Guidelines (Priority: Medium)

### 4.1 Create Style Guide
**File**: `src/theme/guidelines.md`

Document:
- When to use each ProgressMeter variant
- Color usage patterns
- Size recommendations
- Animation guidelines

### 4.2 Component Documentation
Update each component with:
- Usage examples
- Props documentation
- Migration notes from old implementation

## Implementation Schedule

### Week 1: Foundation
- [ ] Day 1-2: Enhance ProgressMeter with stacked/multi-bar support
- [ ] Day 3: Create ProgressMeterGroup component
- [ ] Day 4-5: Add compact mode and test all variants

### Week 2: Migration
- [ ] Day 1: Update ParadigmIndicator
- [ ] Day 2: Update ResearchAnalytics
- [ ] Day 3: Update ParadigmProbabilityBar
- [ ] Day 4: Create LayerProgress component
- [ ] Day 5: Testing and refinement

### Week 3: Documentation
- [ ] Day 1-2: Create visual consistency guidelines
- [ ] Day 3-4: Update component documentation
- [ ] Day 5: Final review and cleanup

## Migration Checklist

### Components to Update:
- [ ] ParadigmIndicator.tsx
- [ ] ParadigmUI.tsx - ResearchAnalytics
- [ ] ParadigmUI.tsx - ParadigmProbabilityBar
- [ ] ParadigmUI.tsx - ContextLayerProgress
- [ ] Any other components with inline progress bars

### Testing Requirements:
- [ ] Visual regression tests for all variants
- [ ] Accessibility testing (ARIA attributes)
- [ ] Performance testing with multiple progress bars
- [ ] Cross-browser compatibility
- [ ] Dark mode support (if applicable)

## Success Metrics

1. **Consistency**: All progress visualizations use ProgressMeter
2. **Performance**: No regression in rendering performance
3. **Maintainability**: Reduced code duplication by 50%+
4. **Accessibility**: All progress bars have proper ARIA labels
5. **Developer Experience**: Clear documentation and examples

## Rollback Strategy

1. Keep old implementations commented out initially
2. Use feature flags for gradual rollout
3. Maintain backward compatibility through wrapper components
4. Document any breaking changes

## Future Enhancements

1. **Animation Presets**: Predefined animation patterns
2. **Theming Support**: Dynamic theme switching
3. **Advanced Visualizations**: Circular progress, wave effects
4. **Performance Monitoring**: Built-in performance metrics
5. **A11y Enhancements**: Screen reader announcements

## Notes

- Prioritize high-traffic components first
- Maintain visual consistency with existing design
- Consider mobile responsiveness
- Test with real data to ensure proper scaling
- Get design team approval before major visual changes