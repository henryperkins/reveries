## Verified Duplications Found

### 1. Persisted State Hooks (3 duplicates)

I found three different hooks handling persisted state in `src/hooks/`:

**usePersistedState.ts** - Uses DatabaseService with localStorage fallback. Includes database connection checking and imports DatabaseService using the alias `import { DatabaseService } from 'databaseService'`.

**useEnhancedPersistedState.ts** - Uses feature flag `VITE_ENABLE_DATABASE_PERSISTENCE` resolved at module level. Also exports `useResearchSessions` hook that duplicates functionality.

**useEnhancedPersistence.ts** - Uses localStorage only, no database integration. Has similar API but different implementation.

### 2. Progress Bar Components

Found multiple components implementing similar gradient bars:

**ProgressBar.tsx** - Implements gradient `from-westworld-gold to-westworld-copper` with shimmer animation and progress segments.

**ContextDensityBar.tsx** - Has hardcoded paradigm color mappings:

```typescript
const paradigmColors = {
  dolores: {
    primary: "bg-red-500",
    gradient: "from-red-400 to-red-600",
    text: "text-red-600",
  },
  teddy: {
    primary: "bg-amber-500",
    gradient: "from-amber-400 to-amber-600",
    text: "text-amber-600",
  },
  bernard: {
    primary: "bg-blue-500",
    gradient: "from-blue-400 to-blue-600",
    text: "text-blue-600",
  },
  maeve: {
    primary: "bg-purple-500",
    gradient: "from-purple-400 to-purple-600",
    text: "text-purple-600",
  },
};
```

**RateLimitIndicator.tsx** - Simple percentage bar with `bg-westworld-rust` color.

### 3. Function Call Visualizers

Three components with overlapping functionality:

**FunctionCallVisualizer.tsx** - Shows expandable function call history with arguments and results in a dark theme.

**LiveFunctionCallIndicator.tsx** - Displays live function calls with status icons (pending, running, completed, failed) and colored backgrounds.

**ToolUsageIndicator.tsx** - Shows research tools with category-based coloring and icon mapping.

### 4. Paradigm Color Duplication

Found paradigm colors defined in multiple places:

**ContextDensityBar.tsx** has one color scheme (red for dolores, amber for teddy, etc.)

**ParadigmUI.tsx** has a different color scheme for the same paradigms (yellow for dolores, red for teddy, etc.)

This inconsistency means the same paradigm shows different colors in different UI components.

### 5. ResearchAgent Service Structure

Found the refactored service architecture:

- `src/services/researchAgentServiceRefactored.ts` - New modular implementation
- `src/services/researchAgentServiceWrapper.ts` - Simply re-exports the refactored service
- Migration documentation exists at `docs/RESEARCH_SERVICE_MIGRATION.md`

### 6. Import Path Issues

I found evidence of the path alias being used inconsistently. The `vite.config.ts` defines:

```typescript
alias: {
  '@': path.resolve(__dirname, './src'),
  databaseService: path.resolve(__dirname, './src/services/databaseServiceStub.ts'),
  ...
}
```

But `src/hooks/usePersistedState.ts` imports using the alias while other files use relative paths.

## Specific Issues Not Found

I couldn't find concrete evidence of:

- Multiple files importing with `../researchGraph` pattern (the audit mentions this needs fixing)
- Root-level duplicate React files mentioned in the audit

The audit's assessment is accurate - there are significant duplications in hooks, UI components, and color definitions that should be consolidated to improve maintainability.

---

# Remediation Plan for Code Duplication Issues

## Phase 1: Unify Core Infrastructure (Priority: High)

### 1.1 Consolidate Persisted State Hooks

**Goal**: Single source of truth for persistence logic

```typescript
// src/hooks/usePersistentState.ts (NEW - unified hook)
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  options?: {
    version?: number;
    enableDatabase?: boolean;
  }
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  // Unified implementation with:
  // - Feature flag check for database
  // - localStorage fallback
  // - Consistent error handling
}
```

**Actions**:

1. Create new `src/hooks/usePersistentState.ts` combining best features
2. Add migration aliases in old files:
   ```typescript
   // src/hooks/usePersistedState.ts
   export { usePersistentState as usePersistedState } from "./usePersistentState";
   ```
3. Update all imports gradually
4. Remove old implementations after full migration

### 1.2 Create Paradigm Theme System

**Goal**: Centralized color/style definitions

```typescript
// src/theme/paradigm.ts
export const PARADIGM_COLORS = {
  dolores: {
    primary: "#DC2626", // red-600
    gradient: ["#F87171", "#DC2626"], // red-400 to red-600
    text: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  // ... other paradigms
} as const;

export function getParadigmTheme(paradigm: HostParadigm) {
  return PARADIGM_COLORS[paradigm];
}
```

**Actions**:

1. Create `src/theme/paradigm.ts` with unified color system
2. Update `ContextDensityBar.tsx` to use theme
3. Update `ParadigmUI.tsx` to use theme
4. Update any other components using paradigm colors

### 1.3 Fix Import Paths

**Goal**: Consistent use of path aliases

**Actions**:

1. Search and replace all relative imports:
   ```bash
   # Find all relative imports
   rg "from '\.\./researchGraph'" src/
   rg "from '\.\./services/" src/
   ```
2. Replace with aliases:
   - `'../researchGraph'` → `'@/researchGraph'`
   - `'../services/...'` → `'@/services/...'`
3. Add ESLint rule to prevent relative imports:
   ```json
   {
     "rules": {
       "no-restricted-imports": [
         "error",
         {
           "patterns": ["../*"]
         }
       ]
     }
   }
   ```

## Phase 2: Component Consolidation (Priority: Medium)

### 2.1 Create Unified Progress Component

**Goal**: Single, flexible progress bar component

```typescript
// src/components/atoms/ProgressMeter.tsx
interface ProgressMeterProps {
  value: number; // 0-100
  label?: string;
  variant?: 'default' | 'gradient' | 'paradigm';
  paradigm?: HostParadigm;
  showPercentage?: boolean;
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressMeter: React.FC<ProgressMeterProps> = ({ ... }) => {
  // Unified implementation
}
```

**Actions**:

1. Create `ProgressMeter` component
2. Refactor existing components to use it:
   - `ProgressBar` → wrapper with `variant="gradient"`
   - `ContextDensityBar` → uses multiple `ProgressMeter` instances
   - `RateLimitIndicator` → wrapper with `variant="default"`
3. Move to `src/components/atoms/` directory

### 2.2 Consolidate Function Call Visualizers

**Goal**: Unified function call display system

```typescript
// src/components/FunctionCallDock/index.tsx
export const FunctionCallDock: React.FC<{
  mode: "history" | "live" | "tools";
  data: FunctionCallData[];
  // ... other props
}> = ({ mode, data }) => {
  // Renders appropriate view based on mode
};

// Context for sharing function call state
export const FunctionCallContext = React.createContext<{
  history: FunctionCallHistory[];
  liveCalls: LiveFunctionCall[];
  toolsUsed: string[];
}>();
```

**Actions**:

1. Create `FunctionCallDock` component system
2. Migrate existing components:
   - `FunctionCallVisualizer` → `mode="history"`
   - `LiveFunctionCallIndicator` → `mode="live"`
   - `ToolUsageIndicator` → `mode="tools"`
3. Create shared context for function call state
4. Update `App.tsx` to use unified component

## Phase 3: Service Layer Cleanup (Priority: Low)

### 3.1 Complete ResearchAgent Migration

**Goal**: Remove legacy code, finalize refactored service

**Actions**:

1. Remove feature flag checks (migration is complete)
2. Delete old service file (if still exists)
3. Simplify wrapper:
   ```typescript
   // src/services/researchAgentService.ts
   export { ResearchAgentService } from "./researchAgentServiceRefactored";
   ```
4. Rename files to remove "Refactored" suffix

### 3.2 Database Service Consistency

**Goal**: Consistent database service usage

**Actions**:

1. Ensure all imports use the alias: `import { DatabaseService } from 'databaseService'`
2. Create runtime detection wrapper if needed
3. Document the stub vs real service pattern

## Phase 4: Documentation & Testing (Priority: Medium)

### 4.1 Update Documentation

**Actions**:

1. Create `docs/ARCHITECTURE.md` explaining:
   - Component hierarchy
   - Service patterns
   - Theme system
   - Import conventions
2. Update `README.md` with new patterns
3. Add inline documentation for shared components

### 4.2 Add Tests for Shared Components

**Actions**:

1. Test `ProgressMeter` with all variants
2. Test paradigm theme consistency
3. Test hook behavior with/without database
4. Add visual regression tests for UI components

## Implementation Schedule

### Week 1: Foundation

- [ ] Day 1-2: Create unified persisted state hook
- [ ] Day 3-4: Implement paradigm theme system
- [ ] Day 5: Fix all import paths

### Week 2: Components

- [ ] Day 1-2: Create and migrate to ProgressMeter
- [ ] Day 3-4: Consolidate function call visualizers
- [ ] Day 5: Test and refine components

### Week 3: Cleanup

- [ ] Day 1-2: Complete service migration
- [ ] Day 3-4: Update documentation
- [ ] Day 5: Add tests

## Success Metrics

1. **Code Reduction**: ~30% fewer lines of code
2. **Consistency**: Single source for colors, themes, persistence
3. **Maintainability**: No duplicate logic across components
4. **Developer Experience**: Clear patterns, good documentation
5. **Performance**: Reduced bundle size from deduplication

## Rollback Plan

Each phase can be rolled back independently:

1. Keep aliases pointing to old implementations
2. Use feature flags for new components
3. Maintain backward compatibility until migration complete
4. Git tags at each phase completion

This plan prioritizes high-impact changes first while maintaining system stability throughout the migration.
