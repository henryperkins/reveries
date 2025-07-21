# Research UI Flow Documentation

This document explains how the research progress UI works and how to avoid redundancy between different UI components.

## Overview

The research UI consists of two main components for displaying progress:

1. **ResearchStepCards** - Shows high-level research phases and results
2. **FunctionCallDock** - Shows detailed tool operations and live progress

## Key Principles

### 1. Separation of Concerns

- **FunctionCallDock**: Displays ALL tool operations (web searches, API calls, etc.)
- **ResearchStepCards**: Displays ONLY high-level phases and final results
- **No Overlap**: Tool operations should NEVER create research step cards

### 2. Card Creation Logic

#### Phase Cards (via `updateProgressState`)

Phase cards are created for meaningful research phases that represent high-level progress:

- `evaluating` - Evaluating Research Quality
- `synthesizing` - Synthesizing Final Answer

The following phases are SKIPPED to avoid redundancy with FunctionCallDock:
- `analyzing` - Shows query analysis operations
- `routing` - Shows paradigm routing operations  
- `researching` - Shows web search operations

#### Progress Message Cards

When progress messages are received in the `onProgress` handler:

1. **Web Search Messages** (`Searching`, `Found`, `results`, `web search`):
   - If already in `researching` phase → Update existing card
   - If operation is already active → Skip card creation
   - Otherwise → Create new card with operation tracking

2. **Reflection Messages** (host evaluation messages):
   - Update existing reflection card if present
   - Create new reflection card only for actual host content

3. **Query Generation Messages**:
   - Update or create query generation cards

## Deduplication Strategy

### 1. Phase-Level Deduplication

```typescript
const createdPhaseCardsRef = useRef<Set<string>>(new Set());
```

Tracks which phase cards have been created to prevent duplicates within a single research session.

### 2. Operation-Level Deduplication

```typescript
const activeOperationsRef = useRef<Set<string>>(new Set());
```

Tracks active operations using keys like `web-research-${progressState}` to prevent duplicate cards for the same operation type and phase.

### 3. Skip Phases Array

```typescript
const skipPhases = ['researching', 'routing', 'analyzing'];
```

Phases that are skipped entirely because they duplicate FunctionCallDock functionality.

## Error Handling

All card creation is wrapped in try-catch blocks to ensure the UI remains stable:

1. On error creating a card, the operation is removed from tracking
2. The UI state returns unchanged
3. Errors are logged to console for debugging

## State Reset

When a new query starts or research completes:
- `createdPhaseCardsRef.current.clear()`
- `activeOperationsRef.current.clear()`
- `lastNodeIdRef.current = null`

This ensures a clean slate for each research session.

## Visual Indicators

1. **Spinning Indicators**: Active cards show spinning animations
2. **Source Citations**: Research cards display sources when available
3. **Tool Usage**: FunctionCallDock shows which tools are being used
4. **Progress States**: The main progress bar shows overall completion

## Best Practices

1. **Always check progressState** before creating cards
2. **Use operation keys** to track unique operations
3. **Update existing cards** instead of creating new ones when possible
4. **Clear tracking refs** at appropriate lifecycle points
5. **Handle errors gracefully** to maintain UI stability