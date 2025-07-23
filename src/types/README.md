# Types Directory

This directory contains the central type definitions for the Reverie Engine.

## Structure

- `index.ts` - Central export file that consolidates all types from across the codebase
- Re-exports types from:
  - Core types (`src/types.ts`)
  - Theme types (`src/theme/types.ts`)
  - Component types (`src/components/types.ts`, `src/components/FunctionCallDock/types.ts`)
  - Service layer types (`src/services/contextLayers/types.ts`, `src/services/research/types.ts`)

## Usage

Import types from this central location:

```typescript
import { 
  HostParadigm, 
  ResearchStep, 
  ModelType,
  ThemeMode,
  // ... other types
} from '@/types';
```

## Utility Functions

The index file also exports several type guard functions:

- `isHostParadigm(value)` - Check if a value is a valid HostParadigm
- `isResearchPhase(value)` - Check if a value is a valid ResearchPhase
- `isContextLayer(value)` - Check if a value is a valid ContextLayer
- `isModelType(value)` - Check if a value is a valid ModelType
- `paradigmToHouse(paradigm)` - Convert HostParadigm to HouseParadigm
- `houseToParadigm(house)` - Convert HouseParadigm to HostParadigm

## Utility Types

- `DeepPartial<T>` - Make all properties of T recursively optional
- `ValueOf<T>` - Get the type of values in an object type
- `Nullable<T>` - T or null
- `Optional<T>` - T or undefined